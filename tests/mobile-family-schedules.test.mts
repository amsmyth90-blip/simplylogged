import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  parseHouseholdSchedulesMutation,
  parseHouseholdSchedulesSnapshot,
  parseSaveHouseholdScheduleRoutine,
  type SaveHouseholdScheduleRoutine,
} from "../packages/household/src/index.ts";
import { mutateHouseholdSchedulePayload } from "../lib/household/schedule-mutation.ts";
import { projectHouseholdSchedulesSnapshot } from "../lib/household/schedule-payload.ts";

const routine: SaveHouseholdScheduleRoutine = {
  title: "Swimming lessons",
  childName: "Alex Greenwood",
  day: 2,
  startTime: "16:00",
  endTime: "17:00",
  repeat: "weekly",
  location: "Riverside Pool",
  responsibleAdult: "Amy Smyth",
  transport: "Car",
  colour: "blue",
  paused: false,
};

test("Family Schedule contracts are strict, bounded and owner-free", () => {
  assert.deepEqual(parseSaveHouseholdScheduleRoutine(routine), routine);
  assert.throws(() => parseSaveHouseholdScheduleRoutine({ ...routine, userId: "other" }));
  assert.throws(() => parseSaveHouseholdScheduleRoutine({ id: "routine-1", ...routine }));
  assert.throws(() => parseSaveHouseholdScheduleRoutine({
    ...routine, startTime: "17:00", endTime: "16:00",
  }), /finish time/);
  assert.throws(() => parseSaveHouseholdScheduleRoutine({ ...routine, day: 7 }));
  assert.throws(() => parseHouseholdSchedulesMutation({
    operation: "DELETE_ROUTINE", revision: null, routineId: "routine-1", ownerId: "other",
  }));
});

test("schedule projection strips unknown data and keeps unique eligible people", () => {
  const snapshot = projectHouseholdSchedulesSnapshot({
    secret: "keep-server-side",
    householdProfiles: [
      { name: "Alex Greenwood", showInSchedules: true, medical: "private" },
      { name: "alex greenwood", showInSchedules: true },
      { name: "Hidden person", showInSchedules: false },
    ],
    kidSchedules: [
      { id: "routine-1", secret: "hidden", ...routine },
      { id: "routine-1", ...routine, title: "Duplicate" },
      { id: "invalid", ...routine, startTime: "bad" },
    ],
  }, "2026-09-04T09:00:00.000Z");
  assert.equal(snapshot.routines.length, 1);
  assert.deepEqual(snapshot.people, ["Alex Greenwood"]);
  assert.equal(JSON.stringify(snapshot).includes("secret"), false);
  assert.deepEqual(parseHouseholdSchedulesSnapshot(snapshot), snapshot);
});

test("large multibyte schedules remain inside the encrypted cache ceiling", () => {
  const routines = Array.from({ length: 300 }, (_, index) => ({
    id: `routine-${index}`,
    ...routine,
    title: `${index}-${"界".repeat(300)}`,
    childName: `Person ${index % 20}`,
    location: "所".repeat(400),
    responsibleAdult: "名".repeat(200),
  }));
  const snapshot = projectHouseholdSchedulesSnapshot({ kidSchedules: routines }, null);
  assert.equal(snapshot.routines.length, 300);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("schedule mutations preserve unrelated state and legacy record fields", () => {
  const source = {
    reminders: [{ id: "keep" }],
    kidSchedules: [{ id: "routine-1", legacyField: "keep", ...routine }],
  };
  const updated = mutateHouseholdSchedulePayload(source, parseHouseholdSchedulesMutation({
    operation: "SAVE_ROUTINE",
    revision: null,
    routineId: "routine-1",
    routine: { ...routine, title: "Updated swimming" },
  }));
  assert.equal(updated.status, "OK");
  assert.deepEqual(updated.payload?.reminders, source.reminders);
  const saved = (updated.payload?.kidSchedules as Record<string, unknown>[])[0]!;
  assert.equal(saved.id, "routine-1");
  assert.equal(saved.legacyField, "keep");
  assert.equal(saved.title, "Updated swimming");

  const created = mutateHouseholdSchedulePayload(updated.payload, parseHouseholdSchedulesMutation({
    operation: "SAVE_ROUTINE", revision: null, routineId: null, routine,
  }), () => "routine-2");
  assert.equal(created.status, "OK");
  assert.equal((created.payload?.kidSchedules as unknown[]).length, 2);
});

test("shared schedule database writes are service-only and membership-bound", async () => {
  const database = new PGlite();
  const migration = await readFile(
    "supabase/migrations/20260904110000_mobile_household_schedule_transaction.sql", "utf8",
  );
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const viewerId = "22222222-2222-4222-8222-222222222222";
  const householdId = "33333333-3333-4333-8333-333333333333";
  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create table public.app_state(id text primary key, payload jsonb not null);
      create table public.households(
        id uuid primary key, owner_id uuid not null
      );
      create table public.household_memberships(
        household_id uuid not null, user_id uuid not null, role text not null, status text not null
      );
      create table public.household_state(
        household_id uuid primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now())
      );
    `);
    await database.query(
      "insert into public.app_state values ($1,$2::jsonb)",
      [ownerId, JSON.stringify({ kidSchedules: [{ id: "legacy" }], householdProfiles: [] })],
    );
    await database.query("insert into public.households values ($1,$2)", [householdId, ownerId]);
    await database.query(
      "insert into public.household_memberships values ($1,$2,'owner','active'),($1,$3,'viewer','active')",
      [householdId, ownerId, viewerId],
    );
    await database.query(
      "insert into public.household_state(household_id,payload,updated_at) values ($1,'{}',$2)",
      [householdId, "2026-09-04T09:00:00.000Z"],
    );
    await database.exec(migration);
    const preserved = await database.query<{ payload: Record<string, unknown> }>(
      "select payload from public.household_state where household_id = $1", [householdId],
    );
    assert.deepEqual(preserved.rows[0]?.payload, {
      kidSchedules: [{ id: "legacy" }], householdProfiles: [],
    });
    const futureOwnerId = "44444444-4444-4444-8444-444444444444";
    const futureHouseholdId = "55555555-5555-4555-8555-555555555555";
    await database.query(
      "insert into public.app_state values ($1,$2::jsonb)",
      [futureOwnerId, JSON.stringify({ kidSchedules: [{ id: "future" }] })],
    );
    await database.query(
      "insert into public.households values ($1,$2)", [futureHouseholdId, futureOwnerId],
    );
    await database.query(
      "insert into public.household_state(household_id,payload) values ($1,'{}')",
      [futureHouseholdId],
    );
    const future = await database.query<{ payload: Record<string, unknown> }>(
      "select payload from public.household_state where household_id = $1", [futureHouseholdId],
    );
    assert.deepEqual(future.rows[0]?.payload, { kidSchedules: [{ id: "future" }] });
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select * from public.apply_mobile_household_schedule_state($1,$2,$3::jsonb)",
      [ownerId, "2026-09-04T09:00:00.000Z", JSON.stringify({ kidSchedules: [] })],
    ), /permission denied|Service role required/i);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const result = await database.query<{ payload: unknown }>(
      "select payload from public.apply_mobile_household_schedule_state($1,$2,$3::jsonb)",
      [ownerId, "2026-09-04T09:00:00.000Z", JSON.stringify({ kidSchedules: [] })],
    );
    assert.deepEqual(result.rows[0]?.payload, { kidSchedules: [] });
    await assert.rejects(database.query(
      "select * from public.apply_mobile_household_schedule_state($1,$2,$3::jsonb)",
      [viewerId, "2026-09-04T09:00:00.000Z", JSON.stringify({ kidSchedules: [] })],
    ), /Schedule access denied/i);
  } finally {
    await database.close();
  }
});

test("mobile Family Schedules use bounded APIs, encrypted cache and complete controls", async () => {
  const [route, server, migration, hook, client, family, screen, editor] = await Promise.all([
    readFile("app/api/mobile/family/schedules/route.ts", "utf8"),
    readFile("lib/household/schedule-server.ts", "utf8"),
    readFile("supabase/migrations/20260904110000_mobile_household_schedule_transaction.sql", "utf8"),
    readFile("apps/mobile/src/family/use-family-schedules.ts", "utf8"),
    readFile("apps/mobile/src/family/family-schedules-client.ts", "utf8"),
    readFile("apps/mobile/src/family/FamilyScreen.tsx", "utf8"),
    readFile("apps/mobile/src/family/FamilySchedulesScreen.tsx", "utf8"),
    readFile("apps/mobile/src/family/FamilyScheduleEditor.tsx", "utf8"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(route, /RequestObservation/);
  assert.match(server, /\.eq\("user_id", userId\)/);
  assert.match(server, /membership\.data\.role !== "owner"/);
  assert.match(server, /apply_mobile_household_schedule_state/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /membership\.role in \('owner', 'member'\)/);
  assert.match(migration, /revoke all[\s\S]*authenticated/);
  assert.match(hook, /CACHE_KEY = "family-schedules"/);
  assert.match(hook, /tryPutReadModel/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(client, /\/api\/mobile\/family\/schedules/);
  assert.match(family, /<FamilyScheduleCard/);
  assert.match(screen, /familyScheduleDays/);
  assert.match(screen, /SAVE_ROUTINE/);
  assert.match(editor, /Delete routine/);
  assert.match(editor, /Pause this routine/);
  assert.match(editor, /id: _id/);
});
