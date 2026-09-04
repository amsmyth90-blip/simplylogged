import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const ownerId = "11111111-1111-4111-8111-111111111111";
const proposedId = "22222222-2222-4222-8222-222222222222";
const viewerId = "33333333-3333-4333-8333-333333333333";
const householdId = "44444444-4444-4444-8444-444444444444";
const session = (value: number) => `55555555-5555-4555-8555-${value.toString().padStart(12, "0")}`;

async function authenticate(database: PGlite, userId: string, sessionId: string) {
  await database.exec("reset role");
  await database.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
  await database.query("select set_config('request.jwt.claim.session_id',$1,false)", [sessionId]);
  await database.exec("set role authenticated");
}

test("household ownership transfer is two-party, recent-authenticated and atomic", async () => {
  const database = new PGlite();
  const [security, transfer, invariants] = await Promise.all([
    read("supabase/migrations/20260901220000_final_security_hardening.sql"),
    read("supabase/migrations/20260904200000_household_ownership_transfer.sql"),
    read("supabase/migrations/20260904201000_household_ownership_invariants.sql"),
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
        select jsonb_build_object('session_id',
          nullif(current_setting('request.jwt.claim.session_id',true),'')) $$;
      create table auth.users(id uuid primary key, email text);
      create table auth.sessions(id uuid primary key, user_id uuid, created_at timestamptz);
      create table public.households(id uuid primary key, name text, owner_id uuid,
        created_at timestamptz default now(), updated_at timestamptz default now());
      create table public.household_memberships(household_id uuid, user_id uuid,
        role text, display_name text default '', relation text default '', status text,
        joined_at timestamptz default now(), updated_at timestamptz default now(),
        primary key(household_id,user_id), unique(user_id));
      create table public.audit_events(id uuid primary key default gen_random_uuid(),
        user_id uuid, household_id uuid, actor_type text, actor_id text,
        event_type text, metadata jsonb, created_at timestamptz default now());
      create function public.touch_household_updated_at() returns trigger
      language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
      create function public.household_role(target_household_id uuid) returns text
      language sql stable security definer as $$ select role from public.household_memberships
        where household_id=target_household_id and user_id=auth.uid() and status='active' $$;
      create function public.ensure_user_household() returns uuid
      language sql security definer as $$ select household_id from public.household_memberships
        where user_id=auth.uid() and status='active' limit 1 $$;
      create function public.check_rate_limit(text,integer,integer)
        returns table(allowed boolean,remaining integer,retry_after_seconds integer,
          reset_at timestamptz) language sql security definer as $$
        select true,10,0,now() $$;
      create function public.create_household_role_invite_without_recent_auth(text,text,text,text)
        returns uuid language sql as $$ select gen_random_uuid() $$;
      create function public.update_household_member_role_without_recent_auth(uuid,text)
        returns boolean language sql as $$ select true $$;
      create function public.remove_household_member_without_recent_auth(uuid)
        returns boolean language sql as $$ select true $$;
      create function public.rename_household_without_recent_auth(text)
        returns boolean language sql as $$ select true $$;
      create function public.leave_household_without_recent_auth()
        returns uuid language sql as $$ select gen_random_uuid() $$;
      grant select,update on public.households to authenticated;
    `);
    await database.exec(recentAuthentication);
    await database.query("insert into auth.users values ($1,'owner@example.com'),($2,'adult@example.com'),($3,'viewer@example.com')",
      [ownerId, proposedId, viewerId]);
    await database.query("insert into auth.sessions values ($1,$2,now()),($3,$4,now()),($5,$6,now())",
      [session(1), ownerId, session(2), proposedId, session(3), viewerId]);
    await database.query("insert into households(id,name,owner_id) values ($1,'Greenwood',$2)",
      [householdId, ownerId]);
    await database.query("insert into household_memberships(household_id,user_id,role,status) values ($1,$2,'owner','active'),($1,$3,'member','active'),($1,$4,'viewer','active')",
      [householdId, ownerId, proposedId, viewerId]);
    await database.exec(transfer);
    await database.exec(invariants);

    await authenticate(database, ownerId, session(1));
    const invalid = await database.query<{ status: string }>(
      "select * from initiate_household_ownership_transfer($1)", [viewerId]);
    assert.equal(invalid.rows[0]?.status, "INVALID_TARGET");
    const started = await database.query<{ status: string; transfer_id: string }>(
      "select * from initiate_household_ownership_transfer($1)", [proposedId]);
    assert.equal(started.rows[0]?.status, "OK");
    const transferId = started.rows[0]!.transfer_id;

    await authenticate(database, viewerId, session(3));
    const forbidden = await database.query<{ status: string }>(
      "select * from resolve_household_ownership_transfer($1,'accept')", [transferId]);
    assert.equal(forbidden.rows[0]?.status, "FORBIDDEN");

    await authenticate(database, proposedId, session(2));
    const accepted = await database.query<{ status: string }>(
      "select * from resolve_household_ownership_transfer($1,'accept')", [transferId]);
    assert.equal(accepted.rows[0]?.status, "OK");
    await database.exec("reset role");
    const ownership = await database.query<{ owner_id: string }>(
      "select owner_id from households where id=$1", [householdId]);
    const roles = await database.query<{ user_id: string; role: string }>(
      "select user_id,role from household_memberships order by user_id");
    assert.equal(ownership.rows[0]?.owner_id, proposedId);
    assert.deepEqual(roles.rows.map((row) => row.role), ["member", "owner", "viewer"]);
    const audit = await database.query<{ event_type: string }>(
      "select event_type from audit_events where event_type like 'HOUSEHOLD_OWNERSHIP%' order by created_at");
    assert.deepEqual(audit.rows.map((row) => row.event_type), [
      "HOUSEHOLD_OWNERSHIP_TRANSFER_REQUESTED", "HOUSEHOLD_OWNERSHIP_TRANSFER_ACCEPTED",
    ]);

    await authenticate(database, proposedId, session(2));
    const reverse = await database.query<{ transfer_id: string }>(
      "select * from initiate_household_ownership_transfer($1)", [ownerId]);
    const reverseId = reverse.rows[0]!.transfer_id;
    const cancelled = await database.query<{ status: string }>(
      "select * from resolve_household_ownership_transfer($1,'cancel')", [reverseId]);
    assert.equal(cancelled.rows[0]?.status, "OK");
    const restarted = await database.query<{ transfer_id: string }>(
      "select * from initiate_household_ownership_transfer($1)", [ownerId]);
    await database.exec("reset role");
    await database.query("insert into auth.sessions values ($1,$2,now()-interval '1 hour')",
      [session(4), ownerId]);
    await authenticate(database, ownerId, session(4));
    await assert.rejects(database.query(
      "select * from resolve_household_ownership_transfer($1,'decline')",
      [restarted.rows[0]!.transfer_id]), /Recent authentication required/i);
    await authenticate(database, ownerId, session(1));
    const declined = await database.query<{ status: string }>(
      "select * from resolve_household_ownership_transfer($1,'decline')",
      [restarted.rows[0]!.transfer_id]);
    assert.equal(declined.rows[0]?.status, "OK");

    await authenticate(database, proposedId, session(2));
    await database.query("select * from initiate_household_ownership_transfer($1)", [ownerId]);
    await database.query("select update_household_member_role($1,'viewer')", [ownerId]);
    await database.exec("reset role");
    const transferRows = await database.query<{ count: number; status: string }>(
      "select count(*)::integer as count,max(status) as status from household_ownership_transfers");
    assert.equal(transferRows.rows[0]?.count, 1);
    assert.equal(transferRows.rows[0]?.status, "cancelled");

    await authenticate(database, ownerId, session(1));
    const noLongerOwner = await database.query<{ status: string }>(
      "select * from initiate_household_ownership_transfer($1)", [proposedId]);
    assert.equal(noLongerOwner.rows[0]?.status, "NOT_OWNER");
    await assert.rejects(database.query("update households set owner_id=$1 where id=$2",
      [ownerId, householdId]), /permission denied/i);
  } finally {
    await database.close();
  }
});

test("ownership migrations serialize administration and bound transfer storage", async () => {
  const [transfer, invariants, route, mobileRoute] = await Promise.all([
    read("supabase/migrations/20260904200000_household_ownership_transfer.sql"),
    read("supabase/migrations/20260904201000_household_ownership_invariants.sql"),
    read("app/api/household/route.ts"), read("app/api/mobile/household/route.ts"),
  ]);
  assert.match(transfer, /household_id uuid not null unique/);
  assert.match(transfer, /interval '24 hours'/);
  assert.match(transfer, /public\.check_rate_limit/);
  assert.match(transfer, /for update/);
  assert.match(invariants, /revoke update on table public\.households from authenticated/);
  assert.match(invariants, /perform public\.lock_current_household\(\)/);
  assert.match(invariants, /deferrable initially deferred/);
  assert.match(route, /Object\.keys\(body\)\.some/);
  assert.match(mobileRoute, /initiate-ownership-transfer/);
});
