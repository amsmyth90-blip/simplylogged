import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  LIFE_CHECK_SCHEMA_VERSION,
  parseLifeCheckMutation,
  parseLifeCheckSnapshot,
} from "../packages/life-check/src/index.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const userId = "11111111-1111-4111-8111-111111111111";
const answers = { homeTenure: "own", vehicles: "yes", pets: "no",
  internationalTravel: "yes", householdCollaboration: "yes", documentStorage: "yes",
  reminders: "yes", completedAt: "2026-09-04T10:00:00.000Z" };

test("Life Check contracts are exact, bounded and owner-free", () => {
  const snapshot = parseLifeCheckSnapshot({ schemaVersion: LIFE_CHECK_SCHEMA_VERSION,
    revision: null, answers, score: 64, answered: 7, totalAnswers: 7,
    categories: [{ id: "home", label: "Home", score: 50, completed: 1, total: 2 }],
    recommendations: [{ id: "cover", title: "Record cover", detail: "Add a policy.",
      target: "OFFICE" }] });
  assert.equal(snapshot.score, 64);
  assert.throws(() => parseLifeCheckSnapshot({ ...snapshot, ownerId: userId }), /invalid/);
  assert.throws(() => parseLifeCheckMutation({ revision: null, field: "pets", value: "maybe" }),
    /answer is invalid/);
  assert.throws(() => parseLifeCheckMutation({ revision: null, field: "pets", value: "yes",
    userId }), /invalid/);
});

test("mobile Life Check is authenticated, bounded, observed and encrypted offline", async () => {
  const [route, server, client, hook, screen, signedIn, settings, migration] = await Promise.all([
    read("app/api/mobile/life-check/route.ts"),
    read("lib/life-check/mobile-life-check-server.ts"),
    read("apps/mobile/src/life-check/life-check-client.ts"),
    read("apps/mobile/src/life-check/use-life-check.ts"),
    read("apps/mobile/src/life-check/LifeCheckScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"), read("apps/mobile/src/settings/SettingsScreen.tsx"),
    read("supabase/migrations/20260904160000_mobile_life_check_transaction.sql"),
  ]);
  assert.match(route, /authenticateHybridRequest/); assert.match(route, /readBoundedJson\(request, 4 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/); assert.match(route, /RequestObservation/);
  assert.match(server, /apply_mobile_life_check/); assert.match(migration, /service_role/);
  assert.match(client, /readBoundedJsonResponse\(response, 64 \* 1024\)/);
  assert.match(hook, /tryPutReadModel\(store, CACHE_KEY/);
  assert.match(hook, /tryRemoveReadModel\(store, CACHE_KEY/);
  assert.doesNotMatch(`${client}\n${hook}\n${screen}`, /localStorage|sessionStorage/);
  assert.match(signedIn, /destination === "LIFE_CHECK"/);
  assert.match(settings, /onNavigate\("LIFE_CHECK"\)/);
});

test("Life Check database writes are targeted, revision checked and service-only", async () => {
  const database = new PGlite(); const migration = await read(
    "supabase/migrations/20260904160000_mobile_life_check_transaction.sql");
  try {
    await database.exec(`
      create role anon nologin; create role authenticated nologin;
      create role service_role nologin bypassrls; create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '') $$;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table auth.users(id uuid primary key);
      create table public.app_state(id text primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now()));
      create function public.touch_app_state_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = timezone('utc', now()); return new; end $$;
      create trigger app_state_set_updated_at before update on public.app_state
        for each row execute function public.touch_app_state_updated_at();
    `);
    await database.exec(migration);
    await database.query("insert into auth.users values ($1)", [userId]);
    await database.query("insert into app_state(id,payload) values ($1,$2::jsonb)",
      [userId, JSON.stringify({ kept: { value: 7 } })]);
    const initial = await database.query<{ updated_at: Date }>(
      "select updated_at from app_state where id=$1", [userId]);
    await database.query("select set_config('request.jwt.claim.role','service_role',false)");
    await database.exec("set role service_role");
    const applied = await database.query<{ status: string; revision: Date }>(
      "select * from apply_mobile_life_check($1,$2,$3::jsonb)",
      [userId, initial.rows[0]!.updated_at, JSON.stringify(answers)]);
    assert.equal(applied.rows[0]?.status, "OK");
    await database.exec("reset role");
    const stored = await database.query<{ payload: { kept: { value: number };
      onboarding: { lifeCheck: typeof answers } } }>("select payload from app_state where id=$1", [userId]);
    assert.equal(stored.rows[0]?.payload.kept.value, 7);
    assert.equal(stored.rows[0]?.payload.onboarding.lifeCheck.vehicles, "yes");
    await database.exec("set role service_role");
    const conflict = await database.query<{ status: string }>(
      "select * from apply_mobile_life_check($1,$2,$3::jsonb)",
      [userId, initial.rows[0]!.updated_at, JSON.stringify({ ...answers, pets: "yes" })]);
    assert.equal(conflict.rows[0]?.status, "CONFLICT");
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query("select * from apply_mobile_life_check($1,null,$2::jsonb)",
      [userId, JSON.stringify(answers)]), /permission denied|Service role required/i);
  } finally { await database.close(); }
});
