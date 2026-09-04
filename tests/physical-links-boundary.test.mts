import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
  PHYSICAL_LINKS_SCHEMA_VERSION,
  parsePhysicalAssetDetail,
  parsePhysicalAssetDetailRequest,
  parsePhysicalLinksMutation,
  parsePhysicalLinksMutationResponse,
  parsePhysicalLinksSnapshot,
} from "../packages/physical-links/src/index.ts";
import {
  buildPhysicalLinksSnapshot,
  PHYSICAL_LINKS_SNAPSHOT_BYTES,
} from "../lib/physical-links-payload.ts";
import { jsonUtf8Bytes } from "../lib/serialization/json-size.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const userId = "11111111-1111-4111-8111-111111111111";
const secondUserId = "22222222-2222-4222-8222-222222222222";
const assetId = "33333333-3333-4333-8333-333333333333";

function asset() {
  return { id: assetId, name: "Kitchen boiler", category: "BOILER", location: "Kitchen",
    manufacturer: "Example", model: "B1", serialNumberMasked: "•••• 1234",
    warrantyDueAt: null, nextServiceAt: null, maintenanceNotes: "Annual service",
    createdAt: "2026-09-04T10:00:00.000Z", updatedAt: "2026-09-04T10:00:00.000Z" };
}

test("Physical Links contracts are exact, bounded and owner-free", () => {
  const snapshot = parsePhysicalLinksSnapshot({ schemaVersion: PHYSICAL_LINKS_SCHEMA_VERSION,
    revision: "3", detailsComplete: true, assets: [asset()], links: [] });
  assert.equal(snapshot.assets[0]?.name, "Kitchen boiler");
  assert.throws(() => parsePhysicalLinksSnapshot({ ...snapshot, ownerId: userId }), /invalid/);
  assert.throws(() => parsePhysicalLinksMutation({ operation: "CREATE_ASSET", revision: "3",
    asset: { name: "Boiler", category: "BOILER", location: "", manufacturer: "", model: "",
      serialNumber: "", warrantyDueAt: "2026-02-30", nextServiceAt: null,
      maintenanceNotes: "" } }), /date is invalid/);
  assert.throws(() => parsePhysicalLinksMutation({ operation: "MANAGE_LINK", revision: "3",
    linkId: assetId, action: "DISABLE", value: "unexpected" }), /value is invalid/);
  const response = parsePhysicalLinksMutationResponse({ snapshot, newLink: {
    id: assetId, path: `/p/${"a".repeat(20)}/${"b".repeat(40)}` } });
  assert.equal(response.newLink?.id, assetId);
});

test("Physical Link detail contracts bind one exact asset without owner input", () => {
  assert.deepEqual(parsePhysicalAssetDetailRequest({ assetId }), { assetId });
  assert.throws(() => parsePhysicalAssetDetailRequest({ assetId, ownerId: userId }), /invalid/);
  const detail = parsePhysicalAssetDetail({ schemaVersion: PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
    asset: asset() });
  assert.equal(detail.asset.updatedAt, "2026-09-04T10:00:00.000Z");
  assert.throws(() => parsePhysicalAssetDetail({ ...detail, ownerId: userId }), /invalid/);
});

test("maximum Physical Links accounts remain inside the mobile response boundary", () => {
  const id = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
  const timestamp = "2026-09-04T10:00:00.000Z";
  const assets = Array.from({ length: 200 }, (_, index) => ({ id: id(index + 1),
    name: "界".repeat(120), category: "EQUIPMENT", location: "界".repeat(120),
    manufacturer: "界".repeat(120), model: "界".repeat(120), serial_number_masked: "•".repeat(16),
    warranty_due_at: null, next_service_at: null, maintenance_notes: "界".repeat(1_000),
    created_at: timestamp, updated_at: timestamp }));
  const links = Array.from({ length: 400 }, (_, index) => ({ id: id(index + 201),
    name: "界".repeat(120), resource_id: assets[index % assets.length]!.id, status: "ACTIVE",
    expires_at: null, last_used_at: null, use_count: 0, created_at: timestamp, updated_at: timestamp }));
  const snapshot = buildPhysicalLinksSnapshot("1", assets, links);
  assert.equal(snapshot.assets.length, 200); assert.equal(snapshot.links.length, 400);
  assert.equal(snapshot.detailsComplete, false);
  assert.ok(jsonUtf8Bytes(snapshot) <= PHYSICAL_LINKS_SNAPSHOT_BYTES);
});

test("Physical Links endpoint is hybrid-authenticated, bounded and observed", async () => {
  const [route, server, migration, web, mobileClient, mobileHook, mobileScreen,
    signedIn, settings] = await Promise.all([
    read("app/api/physical-links/route.ts"), read("lib/physical-links-server.ts"),
    read("supabase/migrations/20260904150000_physical_links_service_boundary.sql"),
    read("components/physical-links/usePhysicalLinks.ts"),
    read("apps/mobile/src/physical-links/physical-links-client.ts"),
    read("apps/mobile/src/physical-links/use-physical-links.ts"),
    read("apps/mobile/src/physical-links/PhysicalLinksScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"), read("apps/mobile/src/settings/SettingsScreen.tsx"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 16 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /parsePhysicalAssetDetailRequest/);
  assert.match(route, /loadPhysicalAssetDetail/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.doesNotMatch(route, /request\.json\(\)/);
  assert.match(server, /apply_physical_links_mutation/);
  assert.match(server, /\.eq\("owner_id", userId\)\.eq\("id", assetId\)/);
  assert.match(server, /createPhysicalLinkToken/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /for update/);
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(web, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(web, /parsePhysicalLinksSnapshot/);
  assert.match(mobileClient, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(mobileClient, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(mobileClient, /loadMobilePhysicalAsset/);
  assert.match(mobileClient, /parsePhysicalAssetDetail/);
  assert.match(mobileHook, /tryPutReadModel\(store, CACHE_KEY/);
  assert.match(mobileHook, /tryRemoveReadModel\(store, CACHE_KEY/);
  assert.match(mobileHook, /readModelCacheKey\("physical-asset"/);
  assert.match(mobileHook, /local\?\.asset\.updatedAt === summary\.updatedAt/);
  assert.match(mobileScreen, /isDetailed=\{physical\.isAssetDetailed\}/);
  assert.doesNotMatch(mobileScreen, /Some long notes are hidden/);
  assert.doesNotMatch(`${mobileClient}\n${mobileHook}\n${mobileScreen}`, /localStorage|sessionStorage/);
  assert.match(signedIn, /destination === "PHYSICAL_LINKS"/);
  assert.match(settings, /onNavigate\("PHYSICAL_LINKS"\)/);
});

test("Physical Links writes are revision checked and service-only", async () => {
  const database = new PGlite();
  const [foundation, boundary] = await Promise.all([
    read("supabase/migrations/20260901170000_physical_links_and_assets.sql"),
    read("supabase/migrations/20260904150000_physical_links_service_boundary.sql"),
  ]);
  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create table auth.users(id uuid primary key);
      create table public.households(id uuid primary key);
      create table public.household_memberships(
        household_id uuid, user_id uuid, status text, created_at timestamptz default now()
      );
      create function public.touch_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = timezone('utc', now()); return new; end $$;
      create function public.can_access_shared_resource(text,text,uuid,text)
      returns boolean language sql stable as $$ select $3 = auth.uid() $$;
      create function public.household_role(uuid)
      returns text language sql stable as $$ select null::text $$;
    `);
    await database.exec(foundation);
    await database.exec(boundary);
    await database.query("insert into auth.users values ($1),($2)", [userId, secondUserId]);
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const createAsset = { operation: "CREATE_ASSET", revision: "0", asset: {
      name: "Kitchen boiler", category: "BOILER", location: "Kitchen", manufacturer: "Example",
      model: "B1", serialNumber: "SERIAL-1234", warrantyDueAt: null, nextServiceAt: null,
      maintenanceNotes: "Annual service" } };
    const created = await database.query<{ status: string; entity_id: string; revision: string }>(
      "select * from public.apply_physical_links_mutation($1,0,$2::jsonb,null,null)",
      [userId, JSON.stringify(createAsset)]);
    assert.equal(created.rows[0]?.status, "OK");
    assert.equal(Number(created.rows[0]?.revision), 1);
    const createdAssetId = created.rows[0]!.entity_id;
    const tokenId = "a".repeat(24); const tokenHash = "b".repeat(64);
    const createLink = { operation: "CREATE_LINK", revision: "1", assetId: createdAssetId,
      name: "Boiler tag", expiresAt: null };
    const linked = await database.query<{ status: string; revision: string }>(
      "select * from public.apply_physical_links_mutation($1,1,$2::jsonb,$3,$4)",
      [userId, JSON.stringify(createLink), tokenId, tokenHash]);
    assert.equal(linked.rows[0]?.status, "OK");
    assert.equal(Number(linked.rows[0]?.revision), 2);
    const stale = await database.query<{ status: string; revision: string }>(
      "select * from public.apply_physical_links_mutation($1,1,$2::jsonb,null,null)",
      [userId, JSON.stringify(createAsset)]);
    assert.equal(stale.rows[0]?.status, "CONFLICT");
    assert.equal(Number(stale.rows[0]?.revision), 2);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select * from public.apply_physical_links_mutation($1,2,$2::jsonb,null,null)",
      [userId, JSON.stringify(createAsset)]), /permission denied|Service role required/i);
    await assert.rejects(database.query(
      "insert into public.assets(owner_id,name) values ($1,'Bypass')", [userId]),
    /permission denied/i);
  } finally { await database.close(); }
});
