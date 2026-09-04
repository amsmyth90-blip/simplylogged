import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  CORE_DASHBOARD_AREA_IDS,
  normaliseDashboardAreaIds,
  ONBOARDING_SCHEMA_VERSION,
  parseOnboardingMutation,
  parseOnboardingSnapshot,
} from "../packages/onboarding/src/index.ts";
import { projectOnboardingSnapshot } from "../lib/onboarding/mobile-onboarding-payload.ts";
import { shouldShowSetup } from "../apps/mobile/src/onboarding/onboarding-model.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const userId = "11111111-1111-4111-8111-111111111111";
const answers = { homeTenure: "own", vehicles: "yes", pets: "no", internationalTravel: "yes",
  householdCollaboration: "yes", documentStorage: "yes", reminders: "yes" } as const;
const setup = { profileName: "Amy Smyth", householdName: "The Smyth household",
  householdMembers: "Me and my partner", selectedAreaIds: normaliseDashboardAreaIds(
    ["family-room", "garage", "driveway"]), answers } as const;

test("onboarding contracts are exact, bounded, owner-free and share dashboard rules", () => {
  assert.deepEqual(normaliseDashboardAreaIds(["garage", "garage", "unknown"]),
    [...CORE_DASHBOARD_AREA_IDS, "garage"]);
  const mutation = parseOnboardingMutation({ revision: null, ...setup });
  assert.equal(mutation.householdName, "The Smyth household");
  assert.throws(() => parseOnboardingMutation({ revision: null, ...setup, userId }), /invalid/);
  assert.throws(() => parseOnboardingMutation({ revision: null, ...setup,
    answers: { ...answers, completedAt: null } }), /invalid/);
  assert.throws(() => parseOnboardingMutation({ revision: null, ...setup,
    selectedAreaIds: ["office", "kitchen", "mailbox", "garage"] }), /areas are invalid/);
});

test("legacy onboarding projects to a strict private mobile snapshot", () => {
  const snapshot = projectOnboardingSnapshot({ settingsProfile: { name: "Amy", email: "private" },
    onboarding: { completed: true, dashboardAreasConfigured: true,
      householdName: "Home", householdMembers: "Just me", selectedRooms: ["garage"],
      lifeCheck: { ...answers, completedAt: "2026-09-04T10:00:00.000Z" } },
    unrelated: { secret: "not projected" } }, "2026-09-04T10:00:00.000Z");
  assert.equal(snapshot.schemaVersion, ONBOARDING_SCHEMA_VERSION);
  assert.equal(snapshot.completed, true); assert.equal(snapshot.profileName, "Amy");
  assert.deepEqual(snapshot.selectedAreaIds, [...CORE_DASHBOARD_AREA_IDS, "garage"]);
  assert.equal("email" in snapshot, false); assert.equal("unrelated" in snapshot, false);
  assert.deepEqual(parseOnboardingSnapshot(snapshot), snapshot);
});

test("an app upgrade never blocks encrypted offline access before setup is cached", () => {
  assert.equal(shouldShowSetup({ editing: false, loading: false, online: false, snapshot: null }), false);
  assert.equal(shouldShowSetup({ editing: false, loading: true, online: false, snapshot: null }), true);
  const incomplete = projectOnboardingSnapshot({}, null);
  assert.equal(shouldShowSetup({ editing: false, loading: false, online: false,
    snapshot: incomplete }), false);
  assert.equal(shouldShowSetup({ editing: false, loading: false, online: true,
    snapshot: incomplete }), true);
  assert.equal(shouldShowSetup({ editing: true, loading: false, online: false,
    snapshot: incomplete }), true);
});

test("mobile onboarding is authenticated, bounded, encrypted offline and specialist-routed", async () => {
  const [route, server, client, hook, screen, home, signedIn, settings, dashboard] = await Promise.all([
    read("app/api/mobile/onboarding/route.ts"), read("lib/onboarding/mobile-onboarding-server.ts"),
    read("apps/mobile/src/onboarding/onboarding-client.ts"),
    read("apps/mobile/src/onboarding/use-mobile-onboarding.ts"),
    read("apps/mobile/src/onboarding/OnboardingScreen.tsx"), read("apps/mobile/src/home/HomeScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"), read("apps/mobile/src/settings/SettingsScreen.tsx"),
    read("lib/dashboard-areas.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/); assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/); assert.match(route, /RequestObservation/);
  assert.match(server, /apply_mobile_onboarding/); assert.match(client, /readBoundedJsonResponse\(response, 32 \* 1024\)/);
  assert.match(hook, /tryPutReadModel\(store, CACHE_KEY/);
  assert.match(hook, /tryRemoveReadModel\(store, CACHE_KEY/);
  assert.doesNotMatch(`${client}\n${hook}\n${screen}`, /localStorage|sessionStorage/);
  assert.match(signedIn, /destination === "ONBOARDING"/); assert.match(settings, /onNavigate\("ONBOARDING"\)/);
  assert.match(home, /visibleAreaIds/); assert.match(dashboard, /@diarydock\/onboarding/);
});

test("onboarding persistence is revision checked, targeted and service-only", async () => {
  const database = new PGlite(); const migration = await read(
    "supabase/migrations/20260904180000_mobile_onboarding_transaction.sql");
  try {
    await database.exec(`
      create role anon nologin; create role authenticated nologin;
      create role service_role nologin bypassrls; create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '') $$;
      create table auth.users(id uuid primary key);
      create table public.app_state(id text primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now()));
      create function public.touch_app_state_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = clock_timestamp(); return new; end $$;
      create trigger app_state_set_updated_at before update on public.app_state
        for each row execute function public.touch_app_state_updated_at();
    `);
    await database.exec(migration); await database.query("insert into auth.users values ($1)", [userId]);
    await database.query("insert into app_state(id,payload) values ($1,$2::jsonb)",
      [userId, JSON.stringify({ kept: { value: 7 }, onboarding: { starterDocuments: [{ id: "one" }] } })]);
    const initial = await database.query<{ updated_at: Date }>(
      "select updated_at from app_state where id=$1", [userId]);
    await database.query("select set_config('request.jwt.claim.role','service_role',false)");
    await database.exec("set role service_role");
    const applied = await database.query<{ status: string }>(
      "select * from apply_mobile_onboarding($1,$2,$3::jsonb)",
      [userId, initial.rows[0]!.updated_at, JSON.stringify(setup)]);
    assert.equal(applied.rows[0]?.status, "OK"); await database.exec("reset role");
    const stored = await database.query<{ payload: { kept: { value: number }; settingsProfile: {
      name: string; initials: string }; onboarding: { completed: boolean; dashboardAreasConfigured: boolean;
      starterDocuments: Array<{ id: string }>; lifeCheck: { completedAt: string } } } }>(
      "select payload from app_state where id=$1", [userId]);
    assert.equal(stored.rows[0]?.payload.kept.value, 7);
    assert.equal(stored.rows[0]?.payload.settingsProfile.initials, "AS");
    assert.equal(stored.rows[0]?.payload.onboarding.completed, true);
    assert.equal(stored.rows[0]?.payload.onboarding.dashboardAreasConfigured, true);
    assert.equal(stored.rows[0]?.payload.onboarding.starterDocuments[0]?.id, "one");
    assert.ok(stored.rows[0]?.payload.onboarding.lifeCheck.completedAt);
    await database.exec("set role service_role");
    const conflict = await database.query<{ status: string }>(
      "select * from apply_mobile_onboarding($1,$2,$3::jsonb)",
      [userId, initial.rows[0]!.updated_at, JSON.stringify({ ...setup, householdName: "Changed" })]);
    assert.equal(conflict.rows[0]?.status, "CONFLICT"); await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query("select * from apply_mobile_onboarding($1,null,$2::jsonb)",
      [userId, JSON.stringify(setup)]), /permission denied|Service role required/i);
  } finally { await database.close(); }
});
