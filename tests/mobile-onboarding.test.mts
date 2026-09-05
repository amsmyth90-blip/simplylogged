import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  ADDITIONAL_DASHBOARD_AREAS,
  CORE_DASHBOARD_AREA_IDS,
  finaliseOnboardingAnswers,
  normaliseDashboardAreaIds,
  ONBOARDING_SCHEMA_VERSION,
  parseOnboardingMutation,
  parseOnboardingSnapshot,
} from "../packages/onboarding/src/index.ts";
import { projectOnboardingSnapshot } from "../lib/onboarding/mobile-onboarding-payload.ts";
import { completeDesktopOnboarding } from "../lib/onboarding/desktop-onboarding-completion.ts";
import {
  answerDraft,
  draftFromSnapshot,
  finaliseOnboardingDraft,
  householdDraft,
  onboardingStepTitles,
  shouldShowSetup,
  stepIsComplete,
} from "../apps/mobile/src/onboarding/onboarding-model.ts";

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

test("onboarding derives repeated choices and asks only for additional areas", () => {
  assert.deepEqual(ADDITIONAL_DASHBOARD_AREAS.map(({ roomId }) => roomId),
    ["bedroom", "attic"]);
  assert.deepEqual(onboardingStepTitles,
    ["Your profile", "Your household", "Your life", "Extra areas", "Your dashboard"]);
  let draft = draftFromSnapshot(projectOnboardingSnapshot({}, null));
  draft = householdDraft(draft, "Me and my partner");
  draft = answerDraft(draft, "homeTenure", "own");
  draft = answerDraft(draft, "vehicles", "yes");
  draft = answerDraft(draft, "pets", "no");
  draft = answerDraft(draft, "internationalTravel", "yes");
  assert.equal(stepIsComplete(2, draft), true);
  assert.equal(draft.answers.householdCollaboration, "yes");
  assert.equal(draft.selectedAreaIds.includes("family-room"), true);
  assert.equal(draft.selectedAreaIds.includes("garage"), true);
  assert.equal(draft.selectedAreaIds.includes("garden"), false);
  assert.equal(draft.selectedAreaIds.includes("driveway"), true);
  const completed = finaliseOnboardingDraft(draft);
  assert.equal(completed.answers.documentStorage, "yes");
  assert.equal(completed.answers.reminders, "yes");
  assert.equal(finaliseOnboardingAnswers(answers, "Just me").householdCollaboration, "no");
});

test("desktop onboarding waits for persistence before navigating", async () => {
  const [provider, hook, controls] = await Promise.all([
    read("components/DiaryDockDataProvider.tsx"),
    read("components/onboarding/useOnboarding.ts"),
    read("components/onboarding/OnboardingControls.tsx"),
  ]);
  assert.match(provider, /persistState: \(state: DiaryDockAppState\) => Promise<void>/);
  assert.match(hook, /await persistState\(next\)/);
  assert.match(hook, /catch \{\s*setSaving\(false\)/);
  assert.match(controls, /disabled=\{!view\.canContinue \|\| view\.saving\}/);
  assert.match(controls, /Saving securely/);
});

test("desktop onboarding derives core choices before its awaited save", () => {
  const state = ({ onboarding: { completed: false, dashboardAreasConfigured: false,
    householdMembers: "Me and my partner", selectedRooms: ["garage", "driveway"],
    lifeCheck: { homeTenure: "own", vehicles: "yes", pets: "no", internationalTravel: "yes",
      householdCollaboration: "not-set", documentStorage: "not-set", reminders: "not-set" } } }) as Parameters<typeof completeDesktopOnboarding>[0];
  const completed = completeDesktopOnboarding(state, "2026-09-05T16:00:00.000Z");
  assert.ok(completed);
  assert.equal(completed.onboarding.completed, true);
  assert.equal(completed.onboarding.dashboardAreasConfigured, true);
  assert.equal(completed.onboarding.lifeCheck.householdCollaboration, "yes");
  assert.equal(completed.onboarding.lifeCheck.documentStorage, "yes");
  assert.equal(completed.onboarding.lifeCheck.reminders, "yes");
  assert.equal(completed.onboarding.lifeCheck.completedAt, "2026-09-05T16:00:00.000Z");
  assert.deepEqual(completed.onboarding.selectedRooms,
    [...CORE_DASHBOARD_AREA_IDS, "garage", "driveway"]);
});

test("mobile onboarding is authenticated, bounded, encrypted offline and specialist-routed", async () => {
  const [route, server, client, hook, screen, home, signedIn, settings, dashboard,
    provisioner] = await Promise.all([
    read("app/api/mobile/onboarding/route.ts"), read("lib/onboarding/mobile-onboarding-server.ts"),
    read("apps/mobile/src/onboarding/onboarding-client.ts"),
    read("apps/mobile/src/onboarding/use-mobile-onboarding.ts"),
    read("apps/mobile/src/onboarding/OnboardingScreen.tsx"), read("apps/mobile/src/home/HomeScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"), read("apps/mobile/src/settings/SettingsScreen.tsx"),
    read("lib/dashboard-areas.ts"),
    read("lib/household/ensure-service-household.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/); assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/); assert.match(route, /RequestObservation/);
  assert.match(server, /ensureServiceHousehold[\s\S]+apply_mobile_onboarding/);
  assert.match(provisioner, /ensure_service_user_household/);
  assert.match(client, /readBoundedJsonResponse\(response, 32 \* 1024\)/);
  assert.match(client, /could not reach its secure service/);
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
