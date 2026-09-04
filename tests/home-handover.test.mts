import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  HOME_HANDOVER_SCHEMA_VERSION,
  HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
  homeHandoverDetailKey,
  homeHandoverOwnerCache,
  parseHomeHandoverDetail,
  parseHomeHandoverDetailRequest,
  parseHomeHandoverMutation,
  parseHomeHandoverSnapshot,
} from "../packages/home-handover/src/index.ts";
import { buildHomeHandoverSnapshot, HOME_HANDOVER_SNAPSHOT_BYTES } from
  "../lib/home-handover-payload.ts";
import { isHandoverAssetCategory, isHandoverDocumentCategory } from "../lib/home-handover.ts";
import { jsonUtf8Bytes } from "../lib/serialization/json-size.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const userId = "11111111-1111-4111-8111-111111111111";
const oldUserId = "22222222-2222-4222-8222-222222222222";
const assetId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-09-04T10:00:00.000Z";

test("handover category rules allow property material and block sensitive lookalikes", () => {
  assert.equal(isHandoverAssetCategory("BOILER"), true);
  assert.equal(isHandoverAssetCategory("OTHER"), false);
  assert.equal(isHandoverDocumentCategory("Appliance manual"), true);
  assert.equal(isHandoverDocumentCategory("Home insurance"), false);
  assert.equal(isHandoverDocumentCategory("Property tax bill"), false);
});

test("Home Handover contracts are exact, bounded and owner-free", () => {
  const snapshot = parseHomeHandoverSnapshot({ schemaVersion: HOME_HANDOVER_SCHEMA_VERSION,
    detailsComplete: true, draft: null, candidates: [], items: [], publication: null,
    received: [], exclusions: ["Private files"] });
  assert.equal(snapshot.detailsComplete, true);
  assert.throws(() => parseHomeHandoverSnapshot({ ...snapshot, ownerId: userId }), /invalid/);
  assert.throws(() => parseHomeHandoverMutation({ operation: "CREATE_PACK", name: "Draft",
    ownerId: userId }), /invalid/);
  assert.throws(() => parseHomeHandoverMutation({ operation: "SET_ITEM", revision: timestamp,
    packId: userId, resourceType: "VAULT", resourceId: assetId, selected: true }), /type is invalid/);
  assert.deepEqual(parseHomeHandoverMutation({ operation: "PUBLISH", revision: timestamp,
    packId: userId, recipientEmail: " New.Owner@Example.com " }).recipientEmail,
  "new.owner@example.com");
  assert.throws(() => parseHomeHandoverMutation({ operation: "PUBLISH", revision: timestamp,
    packId: userId, recipientEmail: "invalid", ownerId: userId }), /invalid/);
});

test("Home Handover detail requests and responses are exact and identity-bound", () => {
  const owner = parseHomeHandoverDetailRequest({ scope: "OWNER", resourceType: "ASSET",
    resourceId: assetId });
  const received = parseHomeHandoverDetailRequest({ scope: "RECEIVED", publicationId: userId,
    itemId: documentId });
  assert.equal(homeHandoverDetailKey(owner), `OWNER:ASSET:${assetId}`);
  assert.equal(homeHandoverDetailKey(received), `RECEIVED:${userId}:${documentId}`);
  const detail = parseHomeHandoverDetail({ ...owner,
    schemaVersion: HOME_HANDOVER_DETAIL_SCHEMA_VERSION, label: "Boiler", detail: "Kitchen" });
  assert.equal(detail.detail, "Kitchen");
  assert.throws(() => parseHomeHandoverDetailRequest({ ...owner, ownerId: userId }), /invalid/);
  assert.throws(() => parseHomeHandoverDetail({ ...detail, resourceId: oldUserId,
    ownerId: userId }), /invalid/);
});

test("maximum handover accounts fit the bounded mobile response", () => {
  const id = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
  const assets = Array.from({ length: 200 }, (_, index) => ({ id: id(index + 1),
    name: "界".repeat(160), category: "EQUIPMENT", location: "界".repeat(120),
    manufacturer: "界".repeat(120), model: "界".repeat(120), document_ids: [],
    handover_eligible: false }));
  const documents = Array.from({ length: 400 }, (_, index) => ({ id: id(index + 201),
    title: "界".repeat(160), category: "Home manual", kind: "manual", issuer: "Example",
    handover_eligible: false }));
  const items = Array.from({ length: 200 }, (_, index) => ({ id: id(index + 601),
    resource_type: "ASSET", resource_id: assets[index]!.id,
    preview_snapshot: { name: "界".repeat(160), location: "界".repeat(120) }, added_at: timestamp }));
  const snapshot = buildHomeHandoverSnapshot({ id: userId, name: "Draft", updated_at: timestamp },
    assets, documents, items);
  assert.equal(snapshot.candidates.length, 600); assert.equal(snapshot.items.length, 200);
  assert.equal(snapshot.detailsComplete, false);
  assert.ok(jsonUtf8Bytes(snapshot) <= HOME_HANDOVER_SNAPSHOT_BYTES);
});

test("published handovers expose only immutable minimal recipient fields", () => {
  const publicationId = "55555555-5555-4555-8555-555555555555";
  const itemId = "66666666-6666-4666-8666-666666666666";
  const shared = { name: "My home", items: [{ id: itemId, resourceType: "ASSET",
    label: "Kitchen boiler", detail: "BOILER · Kitchen" }] };
  const row = { id: publicationId, pack_id: userId, recipient_email: "buyer@example.com",
    published_at: timestamp, expires_at: "2026-10-04T10:00:00.000Z", updated_at: timestamp,
    published_snapshot: shared };
  const snapshot = buildHomeHandoverSnapshot(
    { id: userId, name: "My home", updated_at: timestamp }, [], [], [], row, [row]);
  assert.equal(snapshot.publication?.recipientEmail, "buyer@example.com");
  assert.equal(snapshot.publication?.itemCount, 1);
  assert.equal(snapshot.received[0]?.items[0]?.label, "Kitchen boiler");
  assert.equal("resourceId" in snapshot.received[0]!.items[0]!, false);
  assert.equal("recipientEmail" in snapshot.received[0]!, false);
  assert.equal(homeHandoverOwnerCache(snapshot).received.length, 0);
  assert.equal(homeHandoverOwnerCache(snapshot).publication?.itemCount, 1);
});

test("Home Handover is hybrid-authenticated, bounded, observed and encrypted offline", async () => {
  const [route, server, migration, publication, hook, client, screen, signedIn, settings] = await Promise.all([
    read("app/api/home-handover/route.ts"), read("lib/home-handover-server.ts"),
    read("supabase/migrations/20260904170000_home_handover_service_boundary.sql"),
    read("supabase/migrations/20260904190000_home_handover_publication.sql"),
    read("apps/mobile/src/home-handover/use-home-handover.ts"),
    read("apps/mobile/src/home-handover/home-handover-client.ts"),
    read("apps/mobile/src/home-handover/HomeHandoverScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"), read("apps/mobile/src/settings/SettingsScreen.tsx"),
  ]);
  assert.match(route, /authenticateHybridRequest/); assert.match(route, /hasRecentAuthentication/);
  assert.match(route, /user\.email_confirmed_at/);
  assert.match(route, /readBoundedJson\(request, 4 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/); assert.match(route, /RequestObservation/);
  assert.match(route, /parseHomeHandoverDetailRequest/);
  assert.match(route, /loadHomeHandoverDetail/);
  assert.match(route, /result\.error === "UNAVAILABLE"/);
  assert.doesNotMatch(route, /request\.json\(\)|content-length/i);
  assert.match(server, /apply_home_handover_mutation/); assert.match(migration, /service_role/);
  assert.match(server, /apply_home_handover_publication/);
  assert.match(server, /\.eq\("owner_id", userId\)\.eq\("id", request\.resourceId\)/);
  assert.match(server, /recipientEmail && row\.recipient_email === recipientEmail/);
  assert.match(server, /row\.revoked_at/); assert.match(server, /Date\.parse\(row\.expires_at\)/);
  assert.match(server, /\.gt\("expires_at", now\)/);
  assert.match(publication, /recipient_email/); assert.match(publication, /interval '30 days'/);
  assert.match(publication, /published_snapshot/); assert.match(publication, /service_role/);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(client, /loadMobileHomeHandoverDetail/);
  assert.match(hook, /tryPutReadModel\(store, CACHE_KEY/);
  assert.match(hook, /tryRemoveReadModel\(store, CACHE_KEY/);
  assert.match(hook, /homeHandoverOwnerCache\(snapshot\)/);
  assert.match(hook, /readModelCacheKey\("handover-detail"/);
  assert.match(hook, /detail\.scope !== "OWNER"/);
  assert.match(hook, /request\.scope !== "OWNER"/);
  assert.match(hook, /cachedDetail/); assert.match(hook, /loadMobileHomeHandoverDetail/);
  assert.match(screen, /HomeHandoverDetailText/);
  assert.doesNotMatch(screen, /Some long descriptions are shortened/);
  assert.doesNotMatch(`${hook}\n${client}\n${screen}`, /localStorage|sessionStorage/);
  assert.match(signedIn, /destination === "HOME_HANDOVER"/);
  assert.match(settings, /onNavigate\("HOME_HANDOVER"\)/);
});

test("Home Handover database changes are recent-authenticated, versioned and service-only", async () => {
  const database = new PGlite();
  const [foundation, fix, boundary, publication] = await Promise.all([
    read("supabase/migrations/20260901200000_home_handover_foundation.sql"),
    read("supabase/migrations/20260901201000_fix_home_handover_document_types.sql"),
    read("supabase/migrations/20260904170000_home_handover_service_boundary.sql"),
    read("supabase/migrations/20260904190000_home_handover_publication.sql"),
  ]);
  try {
    await database.exec(`
      create role anon nologin; create role authenticated nologin;
      create role service_role nologin bypassrls; create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '') $$;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table auth.users(id uuid primary key, last_sign_in_at timestamptz, email text);
      create function public.touch_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = timezone('utc', now()); return new; end $$;
      create table public.assets(id uuid primary key, owner_id uuid, name text, category text,
        location text, manufacturer text, model text, warranty_due_at timestamptz,
        next_service_at timestamptz, document_ids text[] default '{}');
      create table public.documents(id uuid primary key, user_id uuid, title text, category text,
        kind text, issuer text);
      create table public.households(id uuid primary key, owner_id uuid);
      create table public.household_memberships(household_id uuid, user_id uuid, status text);
    `);
    await database.exec(foundation); await database.exec(fix); await database.exec(boundary);
    await database.exec(publication);
    await database.query("insert into auth.users values ($1,now(),'owner@example.com'),($2,now()-interval '1 hour','old@example.com')",
      [userId, oldUserId]);
    await database.query("insert into assets values ($1,$2,'Boiler','BOILER','Kitchen','Example','B1',null,null,array[$3])",
      [assetId, userId, documentId]);
    await database.query("insert into documents values ($1,$2,'Boiler manual','Appliance manual','manual','Example',false)",
      [documentId, userId]);
    await database.query("select set_config('request.jwt.claim.role','service_role',false)");
    await database.exec("set role service_role");
    const created = await database.query<{ status: string; pack_id: string; revision: Date }>(
      "select * from apply_home_handover_mutation($1,null,$2::jsonb)",
      [userId, JSON.stringify({ operation: "CREATE_PACK", name: "My home" })]);
    assert.equal(created.rows[0]?.status, "OK");
    const packId = created.rows[0]!.pack_id; const revision = created.rows[0]!.revision;
    const selectItem = { operation: "SET_ITEM", revision: revision.toISOString(), packId,
      resourceType: "ASSET", resourceId: assetId, selected: true };
    const applied = await database.query<{ status: string; revision: Date }>(
      "select * from apply_home_handover_mutation($1,$2,$3::jsonb)",
      [userId, revision, JSON.stringify(selectItem)]);
    assert.equal(applied.rows[0]?.status, "OK");
    const currentRevision = applied.rows[0]!.revision;
    const published = await database.query<{ status: string; publication_id: string }>(
      "select * from apply_home_handover_publication($1,$2,$3::jsonb)",
      [userId, currentRevision, JSON.stringify({ operation: "PUBLISH",
        revision: currentRevision.toISOString(), packId, recipientEmail: "buyer@example.com" })]);
    assert.equal(published.rows[0]?.status, "OK");
    const publicationId = published.rows[0]!.publication_id;
    const stored = await database.query<{ recipient_email: string; published_snapshot: {
      name: string; items: Record<string, unknown>[] }; updated_at: Date }>(
    "select recipient_email,published_snapshot,updated_at from home_handover_publications where id=$1",
    [publicationId]);
    assert.equal(stored.rows[0]?.recipient_email, "buyer@example.com");
    assert.equal(stored.rows[0]?.published_snapshot.name, "My home");
    assert.equal(stored.rows[0]?.published_snapshot.items.length, 1);
    assert.equal("resourceId" in stored.rows[0]!.published_snapshot.items[0]!, false);
    const revoked = await database.query<{ status: string }>(
      "select * from apply_home_handover_publication($1,$2,$3::jsonb)",
      [userId, stored.rows[0]!.updated_at, JSON.stringify({ operation: "REVOKE", publicationId,
        publicationRevision: stored.rows[0]!.updated_at.toISOString() })]);
    assert.equal(revoked.rows[0]?.status, "OK");
    const stale = await database.query<{ status: string }>(
      "select * from apply_home_handover_mutation($1,$2,$3::jsonb)",
      [userId, revision, JSON.stringify(selectItem)]);
    assert.equal(stale.rows[0]?.status, "CONFLICT");
    const old = await database.query<{ status: string }>(
      "select * from apply_home_handover_mutation($1,null,$2::jsonb)",
      [oldUserId, JSON.stringify({ operation: "CREATE_PACK", name: "Old session" })]);
    assert.equal(old.rows[0]?.status, "RECENT_AUTH_REQUIRED");
    await database.query("select prepare_account_deletion($1)", [userId]);
    const remainingPublications = await database.query<{ count: number }>(
      "select count(*)::integer as count from home_handover_publications");
    assert.equal(remainingPublications.rows[0]?.count, 0);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await database.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
    await database.exec("set role authenticated");
    await assert.rejects(database.query("select * from apply_home_handover_mutation($1,null,$2::jsonb)",
      [userId, JSON.stringify({ operation: "CREATE_PACK", name: "Bypass" })]),
    /permission denied|Service role required/i);
    await assert.rejects(database.query("select * from home_handover_items"), /permission denied/i);
    await assert.rejects(database.query("select * from home_handover_publications"), /permission denied/i);
    await assert.rejects(database.query("select * from apply_home_handover_publication($1,null,$2::jsonb)",
      [userId, JSON.stringify({ operation: "REVOKE", publicationId,
        publicationRevision: stored.rows[0]!.updated_at.toISOString() })]),
    /permission denied|Service role required/i);
  } finally { await database.close(); }
});
