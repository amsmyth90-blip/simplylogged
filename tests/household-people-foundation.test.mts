import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";
import { parseHouseholdPeopleDirectory } from "@diarydock/household";

const migrationUrl = new URL(
  "../supabase/migrations/20260910200000_household_people_foundation.sql",
  import.meta.url,
);
const ownerOne = "11111111-1111-4111-8111-111111111111";
const ownerTwo = "22222222-2222-4222-8222-222222222222";
const adultOne = "33333333-3333-4333-8333-333333333333";
const unprovisionedUser = "44444444-4444-4444-8444-444444444444";
const householdOne = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const householdTwo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function database() {
  const pending = new PGlite();
  await pending.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table auth.users(
      id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb
    );
    create table public.app_state(id text primary key, payload jsonb not null default '{}'::jsonb);
    create table public.households(
      id uuid primary key default gen_random_uuid(), name text not null,
      owner_id uuid not null references auth.users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table public.household_memberships(
      household_id uuid not null references public.households(id),
      user_id uuid not null references auth.users(id), role text not null,
      display_name text not null default '', relation text not null default 'Household member',
      status text not null default 'active'
        constraint household_memberships_status_check check(status in ('active','removed')),
      joined_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      primary key(household_id,user_id), unique(user_id)
    );
    create table public.household_state(
      household_id uuid primary key references public.households(id),
      payload jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
    );
    create function public.touch_household_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at=clock_timestamp(); return new; end $$;
    create function public.ensure_user_household() returns uuid language sql security definer as $$
      select household_id from public.household_memberships
      where user_id=auth.uid() and status='active' limit 1 $$;
    create function public.lock_current_household() returns uuid language sql security definer as $$
      select public.ensure_user_household() $$;
    create function public.require_recent_authentication(integer) returns void
      language sql security definer as $$ select $$;
    create function public.check_rate_limit(text,integer,integer)
      returns table(allowed boolean,remaining integer,retry_after_seconds integer,
        reset_at timestamptz) language sql security definer as $$
      select true,29,0,now() $$;
    insert into auth.users(id,email) values
      ('11111111-1111-4111-8111-111111111111','one@example.com'),
      ('22222222-2222-4222-8222-222222222222','two@example.com'),
      ('33333333-3333-4333-8333-333333333333','adult@example.com'),
      ('44444444-4444-4444-8444-444444444444','new@example.com');
    insert into public.households(id,name,owner_id) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','One','11111111-1111-4111-8111-111111111111'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Two','22222222-2222-4222-8222-222222222222');
    insert into public.household_memberships(
      household_id,user_id,role,display_name,relation,status
    ) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner','Owner One','Owner','active'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','member','Adult One','Partner','active'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner','Owner Two','Owner','active');
    insert into public.household_state(household_id,payload) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{}');
  `);
  await pending.exec(await readFile(migrationUrl, "utf8"));
  return pending;
}

async function authenticate(pending: PGlite, userId: string) {
  await pending.exec("reset role");
  await pending.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
  await pending.exec("set role authenticated");
}

test("people contract rejects mixed-tenant and unbounded directories", () => {
  const person = {
    id: "person-1", householdId: householdOne, linkedUserId: null,
    firstName: "Alex", lastName: "", preferredName: "", relationship: "Child",
    personType: "child", dateOfBirth: null, avatarStoragePath: null,
    status: "active", createdAt: "2026-09-10T10:00:00Z",
    updatedAt: "2026-09-10T10:00:00Z",
  };
  assert.equal(parseHouseholdPeopleDirectory({
    householdId: householdOne, currentUserRole: "owner", people: [person],
  }).people[0]?.firstName, "Alex");
  assert.throws(() => parseHouseholdPeopleDirectory({
    householdId: householdOne, currentUserRole: "owner",
    people: [{ ...person, householdId: householdTwo }],
  }), /tenant is invalid/);
  assert.throws(() => parseHouseholdPeopleDirectory({
    householdId: householdOne, currentUserRole: "owner",
    people: Array.from({ length: 51 }, () => person),
  }), /people are invalid/);
});

test("RLS isolates household people and direct writes fail closed", async () => {
  const pending = await database();
  try {
    await authenticate(pending, ownerOne);
    const visible = await pending.query<{ household_id: string }>(
      "select household_id from household_people order by household_id",
    );
    assert.ok(visible.rows.length >= 2);
    assert.ok(visible.rows.every((row) => row.household_id === householdOne));
    await assert.rejects(
      pending.query(
        "insert into household_people(household_id,first_name,relationship) values($1,'Eve','Other')",
        [householdTwo],
      ),
      /permission denied|row-level security/i,
    );

    const created = await pending.query<{ create_household_person: string }>(
      "select create_household_person('Jamie','','','Child','child',null)",
    );
    assert.match(created.rows[0]!.create_household_person, /^[0-9a-f-]{36}$/);

    await authenticate(pending, ownerTwo);
    const hidden = await pending.query<{ count: number }>(
      "select count(*)::integer as count from household_people where id=$1",
      [created.rows[0]!.create_household_person],
    );
    assert.equal(hidden.rows[0]?.count, 0);
  } finally {
    await pending.close();
  }
});

test("only owners mutate people and disabled boundaries deny reads", async () => {
  const pending = await database();
  try {
    await authenticate(pending, adultOne);
    await assert.rejects(
      pending.query("select create_household_person('Sam','','','Child','child',null)"),
      /Household owner required/,
    );
    await pending.exec("reset role");
    await pending.query("update households set status='disabled' where id=$1", [householdOne]);
    await authenticate(pending, ownerOne);
    const result = await pending.query<{ count: number }>(
      "select count(*)::integer as count from household_people",
    );
    assert.equal(result.rows[0]?.count, 0);
  } finally {
    await pending.close();
  }
});

test("existing accounts receive one personal household and linked owner person", async () => {
  const pending = await database();
  try {
    const result = await pending.query<{
      memberships: number;
      households: number;
      people: number;
    }>(`
      select
        (select count(*)::int from household_memberships
          where user_id=$1 and status='active') as memberships,
        (select count(*)::int from households where owner_id=$1) as households,
        (select count(*)::int from household_people
          where linked_user_id=$1 and status='active') as people
    `, [unprovisionedUser]);
    assert.deepEqual(result.rows[0], { memberships: 1, households: 1, people: 1 });
  } finally {
    await pending.close();
  }
});

test("migration preserves private document and storage policies", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.doesNotMatch(migration, /alter table public\.documents|storage\.objects/);
  assert.match(migration, /grant select on table public\.household_people to authenticated/);
  assert.match(migration, /revoke all on table public\.household_people/);
  assert.match(migration, /public\.household_role\(household_id\) is not null/);
  assert.match(migration, /public\.require_recent_authentication\(900\)/);
  assert.match(migration, /public\.check_rate_limit/);
  assert.match(migration, /where membership\.user_id = users\.id and membership\.status = 'active'/);
});
