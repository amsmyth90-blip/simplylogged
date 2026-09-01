import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260901190000_trusted_emergency_access.sql", import.meta.url);
const routePath = new URL("../app/api/emergency-access/route.ts", import.meta.url);

test("trusted contacts are separate, email-bound and deny-by-default", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table if not exists public\.trusted_emergency_contacts/);
  assert.match(sql, /accepted_user_id uuid/);
  assert.match(sql, /current_email <> lower\(contact_record\.email\)/);
  assert.match(sql, /status = 'ACTIVE'/);
  assert.match(sql, /revoked_at is null/);
  assert.match(sql, /revoke insert, update, delete on public\.trusted_emergency_contacts/);
});

test("grants derive snapshots from owner records and never accept arbitrary client snapshots", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const route = await readFile(routePath, "utf8");
  assert.match(sql, /from public\.documents/);
  assert.match(sql, /state_payload->'emergencyPlans'/);
  assert.match(sql, /state_payload->'emergencyContacts'/);
  assert.match(sql, /state_payload->'homeInfo'/);
  assert.doesNotMatch(route, /body\.snapshot|body\.ownerId|body\.acceptedUserId/);
});

test("document files require an active selected grant and sensitive changes require recent sign-in", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const route = await readFile(routePath, "utf8");
  assert.match(sql, /can_read_emergency_document_storage/);
  assert.match(sql, /document\.emergency_visible = true/);
  assert.match(sql, /contact\.accepted_user_id = auth\.uid\(\)/);
  assert.match(route, /hasRecentAuthentication\(auth\.user\.last_sign_in_at\)/);
  assert.match(route, /RECENT_AUTH_REQUIRED/);
});

test("trusted access records redacted audit events and no inactivity release", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /EMERGENCY_ACCESS_GRANTED/);
  assert.match(sql, /EMERGENCY_ACCESS_REVOKED/);
  assert.match(sql, /EMERGENCY_CONTACT_REMOVED/);
  assert.doesNotMatch(sql, /document.*content|extracted_text|automatic_release|death_release|inactivity_release/i);
});
