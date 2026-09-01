import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isHandoverAssetCategory, isHandoverDocumentCategory } from "../lib/home-handover.ts";

const migrationPath = new URL("../supabase/migrations/20260901200000_home_handover_foundation.sql", import.meta.url);
const routePath = new URL("../app/api/home-handover/route.ts", import.meta.url);

test("handover category rules allow property material and block sensitive lookalikes", () => {
  assert.equal(isHandoverAssetCategory("BOILER"), true);
  assert.equal(isHandoverAssetCategory("OTHER"), false);
  assert.equal(isHandoverDocumentCategory("Appliance manual"), true);
  assert.equal(isHandoverDocumentCategory("Home warranty"), true);
  assert.equal(isHandoverDocumentCategory("Home insurance"), false);
  assert.equal(isHandoverDocumentCategory("Property tax bill"), false);
  assert.equal(isHandoverDocumentCategory("Financial correspondence"), false);
});

test("the database derives previews and requires an owned explicit selection", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /require_recent_handover_auth/);
  assert.match(sql, /last_sign_in_at/);
  assert.match(sql, /owner_id = current_user_id/);
  assert.match(sql, /resource_snapshot := jsonb_strip_nulls\(jsonb_build_object/);
  assert.doesNotMatch(sql, /input_(snapshot|owner_id|user_id)/i);
  assert.match(sql, /unique\(pack_id, resource_type, resource_id\)/);
});

test("documents require an eligible asset link and blocked categories cannot enter the manifest", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /document\.id::text = any\(asset\.document_ids\)/);
  assert.match(sql, /financial\|identity\|legal\|estate\|health\|medical\|correspondence\|insurance\|receipt/);
  assert.match(sql, /resource_type in \('ASSET', 'DOCUMENT'\)/);
});

test("the API accepts no arbitrary preview, owner or recipient payload", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /hasRecentAuthentication\(auth\.user\.last_sign_in_at\)/);
  assert.match(route, /content-length/);
  assert.doesNotMatch(route, /body\.(preview|snapshot|ownerId|owner_id|recipient|email)/);
  assert.doesNotMatch(route, /service.role|serviceRole|getSupabaseAdminClient/i);
});
