import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  KITCHEN_CALENDAR_SCHEMA_VERSION,
  parseKitchenCalendarMutation,
  parseKitchenCalendarSnapshot,
} from "../packages/kitchen/src/index.ts";
import {
  mutateKitchenCalendarPayload,
  projectKitchenCalendar,
} from "../lib/kitchen/calendar-payload.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const revision = "2026-09-06T12:00:00.000Z";

function event() {
  return { id: "calendar-1", title: "Dentist", date: "2026-09-06", time: "10:30",
    category: "appointments" as const, assignedTo: "Amy" };
}

test("Kitchen calendar contracts are exact, bounded and owner-free", () => {
  const snapshot = parseKitchenCalendarSnapshot({
    schemaVersion: KITCHEN_CALENDAR_SCHEMA_VERSION,
    revision,
    events: [event()],
  });
  assert.equal(snapshot.events[0]?.title, "Dentist");
  assert.throws(() => parseKitchenCalendarSnapshot({ ...snapshot, ownerId: "another-user" }),
    /unsupported information/);
  assert.throws(() => parseKitchenCalendarSnapshot({ ...snapshot, events: [event(), event()] }),
    /duplicate events/);
  assert.throws(() => parseKitchenCalendarMutation({ operation: "SAVE_EVENT", revision,
    eventId: null, event: { title: "Dentist", date: "2026-02-30", time: "10:30",
      category: "appointments", assignedTo: "Amy" } }), /date is invalid/);
  assert.throws(() => parseKitchenCalendarMutation({ operation: "SAVE_EVENT", revision,
    eventId: null, event: { title: "Dentist", date: "2026-09-06", time: "25:00",
      category: "appointments", userId: "another-user" } }), /unsupported information/);
});

test("Kitchen calendar projection and mutations preserve unrelated private state", () => {
  const source = { privateFlag: { keep: true }, familyCalendarEvents: [event()],
    kitchenRecipes: [{ id: "recipe-1", name: "Soup" }] };
  const snapshot = projectKitchenCalendar(source, revision);
  assert.deepEqual(snapshot.events, [event()]);
  assert.equal("privateFlag" in snapshot, false);
  const updated = mutateKitchenCalendarPayload(source, parseKitchenCalendarMutation({
    operation: "SAVE_EVENT", revision, eventId: "calendar-1",
    event: { title: "Dental check-up", date: "2026-09-07", time: "11:00",
      category: "appointments", assignedTo: "Amy" },
  }));
  assert.equal(updated.status, "OK");
  assert.deepEqual(updated.payload?.privateFlag, source.privateFlag);
  assert.deepEqual(updated.payload?.kitchenRecipes, source.kitchenRecipes);
  assert.equal((updated.payload?.familyCalendarEvents as Array<{ title: string }>)[0]?.title,
    "Dental check-up");
  assert.equal(source.familyCalendarEvents[0]?.title, "Dentist");
});

test("Kitchen calendar database writes are revision checked and service-only", async () => {
  const database = new PGlite();
  const migration = await read(
    "supabase/migrations/20260906153000_mobile_kitchen_calendar_transaction.sql",
  );
  const userId = "11111111-1111-4111-8111-111111111111";
  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create table auth.users(id uuid primary key);
      create table public.app_state(id text primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now()));
    `);
    await database.exec(migration);
    await database.query("insert into auth.users values ($1)", [userId]);
    await database.query("insert into public.app_state(id,payload) values ($1,$2::jsonb)",
      [userId, JSON.stringify({ familyCalendarEvents: [] })]);
    const row = await database.query<{ updated_at: string }>(
      "select updated_at from public.app_state where id=$1", [userId],
    );
    const expected = row.rows[0]!.updated_at;
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select * from public.apply_mobile_kitchen_calendar_state($1,$2,$3::jsonb)",
      [userId, expected, JSON.stringify({ familyCalendarEvents: [event()] })],
    ), /permission denied|Service role required/i);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const saved = await database.query(
      "select * from public.apply_mobile_kitchen_calendar_state($1,$2,$3::jsonb)",
      [userId, expected, JSON.stringify({ familyCalendarEvents: [event()] })],
    );
    assert.equal(saved.rows.length, 1);
    const conflict = await database.query(
      "select * from public.apply_mobile_kitchen_calendar_state($1,$2,$3::jsonb)",
      [userId, "2020-01-01T00:00:00.000Z", JSON.stringify({ familyCalendarEvents: [] })],
    );
    assert.equal(conflict.rows.length, 0);
  } finally { await database.close(); }
});

test("native Kitchen calendar matches the wrapper layout and security boundaries", async () => {
  const [route, service, hook, screen, model, router, wrapper, wrapperModel,
    migration] = await Promise.all([
    read("app/api/mobile/kitchen/calendar/route.ts"),
    read("lib/kitchen/calendar-server.ts"),
    read("apps/mobile/src/kitchen/use-kitchen-calendar.ts"),
    read("apps/mobile/src/kitchen/KitchenCalendarScreen.tsx"),
    read("apps/mobile/src/kitchen/calendar-model.ts"),
    read("apps/mobile/src/room-navigation.ts"),
    read("components/kitchen-feature/FamilyCalendar.tsx"),
    read("components/kitchen-feature/kitchen-feature-model.ts"),
    read("supabase/migrations/20260906153000_mobile_kitchen_calendar_transaction.sql"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 4 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  assert.match(router, /calendar: "KITCHEN_CALENDAR"/);
  for (const label of ["Family calendar", "Appointments", "School", "Meals", "Family"]) {
    assert.match(`${screen}\n${model}`, new RegExp(label));
    assert.match(`${wrapper}\n${wrapperModel}`, new RegExp(label));
  }
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(migration, /to service_role/);
});
