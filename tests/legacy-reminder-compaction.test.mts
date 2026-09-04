import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const ownerId = "11111111-1111-4111-8111-111111111111";
const householdId = "22222222-2222-4222-8222-222222222222";

const schema = [
  "create schema auth",
  "create role anon nologin",
  "create role authenticated nologin",
  "create role service_role nologin",
  "create table auth.users(id uuid primary key)",
  "create table public.households(id uuid primary key,owner_id uuid not null)",
  "create table public.household_memberships(household_id uuid,user_id uuid,role text,status text)",
  "create table public.household_state(household_id uuid primary key,payload jsonb not null)",
  "create table public.app_state(id text primary key,payload jsonb not null)",
  "create table public.documents(id text primary key)",
  "create table public.reminders("
    + "id text primary key,user_id uuid not null,scope_kind text not null,scope_id uuid not null,"
    + "title text not null,note text,room_id text,room_name text,reminder_group text not null,"
    + "time_label text not null,priority text not null,repeat text,document_id text,"
    + "document_title text,assigned_to text,due_at timestamptz,origin text not null default 'USER_CREATED',"
    + "reminder_type text not null default 'custom',time_zone text not null default 'Europe/London')",
].join(";");

async function migration(name: string) {
  return readFile(
    new URL("../supabase/migrations/" + name, import.meta.url),
    "utf8",
  );
}

function legacyPayload() {
  const valid = {
    id: "valid-reminder",
    title: "Renew insurance",
    group: "week",
    timeLabel: "This week",
    priority: "normal",
    note: "Check the policy",
  };
  const collision = {
    id: "collision-reminder",
    title: "Legacy title",
    group: "later",
    timeLabel: "Later",
    priority: "low",
  };
  return { valid, collision, payload: { reminders: [valid, collision, { id: "incomplete" }] } };
}

async function reminderCount(database: PGlite) {
  const result = await database.query<{ count: number }>(
    "select count(*)::integer as count from public.reminders",
  );
  return result.rows[0]?.count;
}

async function stateReminders(database: PGlite, table: string) {
  const result = await database.query<{ reminders: unknown[] }>(
    "select payload->'reminders' as reminders from public." + table,
  );
  return result.rows[0]?.reminders ?? [];
}

test("legacy reminder migration compacts only proven normalized entries", async () => {
  const database = new PGlite();
  try {
    await database.exec(schema);
    await database.query("insert into auth.users(id) values ($1)", [ownerId]);
    await database.query(
      "insert into public.households(id,owner_id) values ($1,$2)",
      [householdId, ownerId],
    );
    await database.query(
      "insert into public.household_memberships values ($1,$2,'owner','active')",
      [householdId, ownerId],
    );
    const values = legacyPayload();
    await database.query(
      "insert into public.reminders(id,user_id,scope_kind,scope_id,title,reminder_group,time_label,priority) "
        + "values ('collision-reminder',$1,'HOUSEHOLD',$2,'Different title','later','Later','low')",
      [ownerId, householdId],
    );
    await database.query(
      "insert into public.household_state values ($1,$2::jsonb)",
      [householdId, JSON.stringify(values.payload)],
    );
    await database.query(
      "insert into public.app_state values ($1,$2::jsonb)",
      [ownerId, JSON.stringify(values.payload)],
    );

    await database.exec(await migration("20260904216000_migrate_legacy_reminder_state.sql"));
    await database.exec(await migration("20260904217000_compact_legacy_reminder_state.sql"));
    assert.equal(await reminderCount(database), 2);
    const marker = await database.query<{ legacy_source_key: string | null }>(
      "select legacy_source_key from public.reminders where id='valid-reminder'",
    );
    assert.equal(
      marker.rows[0]?.legacy_source_key,
      "HOUSEHOLD:" + householdId + ":valid-reminder",
    );
    assert.equal((await stateReminders(database, "household_state")).length, 2);
    assert.equal((await stateReminders(database, "app_state")).length, 2);

    await database.query(
      "update public.household_state set payload=jsonb_set(payload,'{reminders}','[]'::jsonb)",
    );
    assert.equal((await stateReminders(database, "household_state")).length, 2);

    const future = {
      id: "future-reminder",
      title: "Future task",
      group: "today",
      timeLabel: "Today",
      priority: "high",
    };
    await database.query(
      "insert into public.reminders(id,user_id,scope_kind,scope_id,title,reminder_group,time_label,priority) "
        + "values ($1,$2,'HOUSEHOLD',$3,$4,$5,$6,$7)",
      [future.id, ownerId, householdId, future.title, future.group, future.timeLabel, future.priority],
    );
    await database.query(
      "update public.household_state set payload=jsonb_set(payload,'{reminders}',$1::jsonb)",
      [JSON.stringify([future])],
    );
    assert.equal((await stateReminders(database, "household_state")).length, 2);

    const repository = await readFile(
      new URL("../lib/diarydock-repository.ts", import.meta.url),
      "utf8",
    );
    assert.match(repository, /reminders:\s*\[\]/);
  } finally {
    await database.close();
  }
});
