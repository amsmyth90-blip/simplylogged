import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL(
  "../supabase/migrations/20260905200000_service_household_provisioning.sql",
  import.meta.url,
);

async function database() {
  const pending = new PGlite();
  await pending.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    create table auth.users(id uuid primary key);
    create table public.households(
      id uuid primary key default gen_random_uuid(), name text not null,
      owner_id uuid not null references auth.users(id)
    );
    create table public.household_memberships(
      household_id uuid not null references public.households(id),
      user_id uuid not null references auth.users(id),
      role text not null, display_name text not null, relation text not null,
      status text not null, joined_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key(household_id,user_id), unique(user_id)
    );
  `);
  await pending.exec(await readFile(migrationUrl, "utf8"));
  return pending;
}

async function useRole(pending: PGlite, role: "authenticated" | "service_role") {
  await pending.exec("reset role");
  await pending.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await pending.exec(`set role ${role}`);
}

test("service onboarding provisions one household idempotently", async () => {
  const pending = await database();
  const userId = "11111111-1111-4111-8111-111111111111";
  try {
    await pending.query("insert into auth.users(id) values ($1)", [userId]);
    await useRole(pending, "service_role");
    const first = await pending.query<{ ensure_service_user_household: string }>(
      "select ensure_service_user_household($1,$2,$3)", [userId, "Amy's home", "Amy"],
    );
    const second = await pending.query<{ ensure_service_user_household: string }>(
      "select ensure_service_user_household($1,$2,$3)", [userId, "Other", "Changed"],
    );
    assert.equal(second.rows[0]?.ensure_service_user_household,
      first.rows[0]?.ensure_service_user_household);
    await pending.exec("reset role");
    const counts = await pending.query<{ households: number; memberships: number }>(`
      select (select count(*)::int from households) as households,
        (select count(*)::int from household_memberships) as memberships
    `);
    assert.deepEqual(counts.rows[0], { households: 1, memberships: 1 });
  } finally { await pending.close(); }
});

test("service provisioning rejects public callers and invalid accounts", async () => {
  const pending = await database();
  try {
    await useRole(pending, "authenticated");
    await assert.rejects(pending.query(
      "select ensure_service_user_household($1,$2,$3)",
      ["11111111-1111-4111-8111-111111111111", "Home", "Amy"],
    ), /permission denied|Service role required/i);
    await useRole(pending, "service_role");
    await assert.rejects(pending.query(
      "select ensure_service_user_household($1,$2,$3)",
      ["11111111-1111-4111-8111-111111111111", "Home", "Amy"],
    ), /Invalid account/);
  } finally { await pending.close(); }
});
