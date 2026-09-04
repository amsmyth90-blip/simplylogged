import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const ownerId = "11111111-1111-4111-8111-111111111111";
const recipientId = "22222222-2222-4222-8222-222222222222";
const householdId = "33333333-3333-4333-8333-333333333333";
const privateHouseholdId = "44444444-4444-4444-8444-444444444444";
const token = "55555555-5555-4555-8555-555555555555";
const freshSession = "66666666-6666-4666-8666-666666666666";
const staleSession = "77777777-7777-4777-8777-777777777777";

async function authenticate(database: PGlite, sessionId: string, email: string) {
  await database.exec("reset role");
  await database.query("select set_config('request.jwt.claim.sub',$1,false)", [recipientId]);
  await database.query("select set_config('request.jwt.claim.session_id',$1,false)", [sessionId]);
  await database.query("select set_config('request.jwt.claim.email',$1,false)", [email]);
  await database.exec("set role authenticated");
}

test("household invite acceptance requires a fresh matching account and preserves boundaries", async () => {
  const database = new PGlite();
  const [security, acceptance] = await Promise.all([
    read("supabase/migrations/20260901220000_final_security_hardening.sql"),
    read("supabase/migrations/20260904204000_household_invite_acceptance_hardening.sql"),
  ]);
  const recentAuthentication = security.slice(0,
    security.indexOf("create or replace function public.require_recent_handover_auth"));
  try {
    await database.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$
        select jsonb_build_object(
          'session_id',nullif(current_setting('request.jwt.claim.session_id',true),''),
          'email',nullif(current_setting('request.jwt.claim.email',true),'')
        ) $$;
      create table auth.users(id uuid primary key, email text);
      create table auth.sessions(id uuid primary key, user_id uuid, created_at timestamptz);
      create table public.households(
        id uuid primary key, name text not null, owner_id uuid not null,
        created_at timestamptz default now(), updated_at timestamptz default now()
      );
      create table public.household_memberships(
        household_id uuid not null references households(id) on delete cascade,
        user_id uuid not null, role text not null, display_name text not null default '',
        relation text not null default '', status text not null default 'active',
        joined_at timestamptz default now(), updated_at timestamptz default now(),
        primary key(household_id,user_id), unique(user_id)
      );
      create table public.household_state(
        household_id uuid primary key references households(id) on delete cascade,
        payload jsonb not null default '{}', updated_at timestamptz default now()
      );
      create table public.household_invites(
        token uuid primary key, household_id uuid not null references households(id),
        email text not null, name text not null, relation text not null,
        access text not null, role text not null, invited_by uuid not null,
        status text not null, expires_at timestamptz not null,
        accepted_by uuid, accepted_at timestamptz,
        created_at timestamptz default now(), updated_at timestamptz default now()
      );
      create function public.check_rate_limit(text,integer,integer)
        returns table(allowed boolean,remaining integer,retry_after_seconds integer,
          reset_at timestamptz) language sql security definer as $$
        select true,29,0,now() $$;
    `);
    await database.exec(recentAuthentication);
    await database.exec(acceptance);
    await database.query("insert into auth.users values ($1,'owner@example.test'),($2,'alex@example.test')",
      [ownerId, recipientId]);
    await database.query("insert into auth.sessions values ($1,$2,now()),($3,$2,now()-interval '1 hour')",
      [freshSession, recipientId, staleSession]);
    await database.query("insert into households(id,name,owner_id) values ($1,'Greenwood',$2),($3,'Private',$4)",
      [householdId, ownerId, privateHouseholdId, recipientId]);
    await database.query("insert into household_memberships(household_id,user_id,role,display_name) values ($1,$2,'owner','Owner'),($3,$4,'owner','Alex')",
      [householdId, ownerId, privateHouseholdId, recipientId]);
    await database.query("insert into household_state(household_id,payload) values ($1,$2::jsonb)",
      [householdId, JSON.stringify({ householdMembers: [], familyInvites: [{ id: token }] })]);
    await database.query(`insert into household_invites
      (token,household_id,email,name,relation,access,role,invited_by,status,expires_at)
      values ($1,$2,'alex@example.test','Alex','Partner','Adult','member',$3,'pending',now()+interval '1 day')`,
      [token, householdId, ownerId]);

    await authenticate(database, staleSession, "alex@example.test");
    await assert.rejects(database.query("select accept_household_invite($1)", [token]),
      /Recent authentication required/i);
    await authenticate(database, freshSession, "other@example.test");
    await assert.rejects(database.query("select accept_household_invite($1)", [token]),
      /email address/i);
    await authenticate(database, freshSession, "alex@example.test");
    await assert.rejects(database.query("select accept_household_invite($1)", [token]),
      /already belongs to another household/i);

    await database.exec("reset role");
    await database.query("delete from household_memberships where household_id=$1", [privateHouseholdId]);
    await authenticate(database, freshSession, "alex@example.test");
    const joined = await database.query<{ accept_household_invite: string }>(
      "select accept_household_invite($1)", [token]);
    assert.equal(joined.rows[0]?.accept_household_invite, householdId);
    await database.exec("reset role");
    const membership = await database.query<{ role: string }>(
      "select role from household_memberships where user_id=$1", [recipientId]);
    const invite = await database.query<{ status: string; accepted_by: string }>(
      "select status,accepted_by from household_invites where token=$1", [token]);
    assert.equal(membership.rows[0]?.role, "member");
    assert.deepEqual(invite.rows[0], { status: "accepted", accepted_by: recipientId });
  } finally {
    await database.close();
  }
});

test("invite acceptance is rate bounded and does not accept household identity from clients", async () => {
  const [migration, route, mobileRoute] = await Promise.all([
    read("supabase/migrations/20260904204000_household_invite_acceptance_hardening.sql"),
    read("app/api/household/route.ts"), read("app/api/mobile/household/route.ts"),
  ]);
  assert.match(migration, /require_recent_authentication\(900\)/);
  assert.match(migration, /check_rate_limit/);
  assert.match(migration, /for update/);
  assert.match(route, /"accept-invite"/);
  assert.match(mobileRoute, /"accept-invite": new Set\(\["action", "token"\]\)/);
  assert.doesNotMatch(mobileRoute, /body\.householdId|body\.ownerId/);
});
