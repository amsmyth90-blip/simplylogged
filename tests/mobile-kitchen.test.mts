import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { parseKitchenMutation } from "../packages/kitchen/src/index.ts";
import { mutateKitchenPayload, projectKitchenSnapshot } from "../lib/kitchen/payload.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const revision = "2026-09-02T09:00:00.000Z";

test("Kitchen writes preserve unrelated web state and enforce duplicates", () => {
  const source = {
    privateEstateData: { unchanged: true },
    kitchenRecipes: [{ id: "recipe-1", name: "Soup" }],
    kitchenItems: [{ id: "existing", name: "Milk", checked: false, section: "Shopping" }],
  };
  const result = mutateKitchenPayload(source, parseKitchenMutation({
    operation: "ADD_ITEM",
    revision,
    name: "Bread",
    section: "Shopping",
  }), () => "fixed-id");
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.privateEstateData, source.privateEstateData);
  assert.deepEqual(result.payload.kitchenRecipes, source.kitchenRecipes);
  assert.equal((result.payload.kitchenItems as Array<{ id: string }>)[1]?.id, "kitchen-fixed-id");
  assert.equal(source.kitchenItems.length, 1);
  assert.equal(mutateKitchenPayload(source, parseKitchenMutation({
    operation: "ADD_ITEM",
    revision,
    name: " milk ",
    section: "Shopping",
  })).status, "DUPLICATE");
});

test("Kitchen photo results can be saved as one bounded idempotent batch", () => {
  const source = { privateFlag: "keep", kitchenItems: [
    { id: "existing", name: "Milk", checked: true, section: "Pantry" },
  ] };
  const mutation = parseKitchenMutation({ operation: "ADD_ITEMS", revision,
    names: [" milk ", "Bread", "Eggs"], section: "Pantry" });
  let nextId = 0;
  const result = mutateKitchenPayload(source, mutation, () => String(++nextId));
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.equal((result.payload.kitchenItems as unknown[]).length, 3);
  assert.equal(result.payload.privateFlag, "keep");
  assert.equal(mutateKitchenPayload(result.payload, mutation).status, "OK");
  assert.throws(() => parseKitchenMutation({ operation: "ADD_ITEMS", revision,
    names: Array.from({ length: 121 }, () => "Item"), section: "Pantry" }), /invalid/);
});

test("Kitchen projection excludes malformed and unrelated legacy data", () => {
  const snapshot = projectKitchenSnapshot({
    bankAccount: "not-for-mobile",
    kitchenItems: [
      { id: "valid", name: "Rice", checked: true, section: "Pantry" },
      { id: "invalid", name: "", checked: false, section: "Shopping" },
    ],
  }, revision);
  assert.equal(snapshot.items.length, 1);
  assert.equal("bankAccount" in snapshot, false);
});

test("Kitchen item mutations are targeted and preserve section meaning", () => {
  const source = {
    kitchenItems: [{ id: "item-1", name: "Rice", checked: false, section: "Shopping" }],
  };
  const moved = mutateKitchenPayload(source, parseKitchenMutation({
    operation: "MOVE_ITEM",
    revision,
    itemId: "item-1",
    section: "Pantry",
  }));
  assert.equal(moved.status, "OK");
  if (moved.status !== "OK") return;
  assert.deepEqual((moved.payload.kitchenItems as unknown[])[0], {
    id: "item-1",
    name: "Rice",
    checked: true,
    section: "Pantry",
  });
  assert.equal(source.kitchenItems[0]?.section, "Shopping");
});

test("Kitchen item database writes are revision checked and service-only", async () => {
  const database = new PGlite();
  const migration = await read("supabase/migrations/20260904144000_mobile_kitchen_items_transaction.sql");
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
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select * from public.apply_mobile_kitchen_items_state($1,null,$2::jsonb)",
      [userId, JSON.stringify({ kitchenItems: [] })],
    ), /permission denied|Service role required/i);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const created = await database.query(
      "select * from public.apply_mobile_kitchen_items_state($1,null,$2::jsonb)",
      [userId, JSON.stringify({ kitchenItems: [] })],
    );
    assert.equal(created.rows.length, 1);
    const conflict = await database.query(
      "select * from public.apply_mobile_kitchen_items_state($1,$2,$3::jsonb)",
      [userId, "2020-01-01T00:00:00.000Z", JSON.stringify({ replaced: true })],
    );
    assert.equal(conflict.rows.length, 0);
  } finally { await database.close(); }
});

test("mobile Kitchen is owner-scoped, bounded, revision-safe and encrypted offline", async () => {
  const [route, analysisRoute, analysisRequest, analysisClient, pantry, service, hook, app,
    room, migration] = await Promise.all([
    read("app/api/mobile/kitchen/route.ts"),
    read("app/api/mobile/kitchen/analyse/route.ts"),
    read("lib/kitchen/pantry-analysis-request.ts"),
    read("apps/mobile/src/kitchen/pantry-analysis-client.ts"),
    read("apps/mobile/src/kitchen/PantryCaptureStage.tsx"),
    read("lib/kitchen/snapshot-server.ts"),
    read("apps/mobile/src/kitchen/use-kitchen.ts"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/rooms/RoomScreen.tsx"),
    read("supabase/migrations/20260904144000_mobile_kitchen_items_transaction.sql"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 2 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(analysisRoute, /authenticateHybridRequest/);
  assert.match(analysisRoute, /checkServerRateLimit/);
  assert.match(analysisRequest, /readBoundedMultiFile/);
  assert.match(analysisRequest, /inspectCaptureFile/);
  assert.match(analysisClient, /readBoundedJsonResponse/);
  assert.match(analysisClient, /requestDeadline\(90_000\)/);
  for (const label of ["See what&apos;s in your kitchen", "Take photos", "Choose photos",
    "Check my kitchen", "Pantry", "Shopping"]) assert.match(pantry, new RegExp(label));
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(service, /apply_mobile_kitchen_items_state/);
  assert.match(service, /status: "CONFLICT"/);
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  assert.match(app, /import\("@mobile\/kitchen\/KitchenScreen"\)/);
  assert.match(room, /Pantry & shopping/);
});
