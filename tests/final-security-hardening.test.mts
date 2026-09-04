import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260901220000_final_security_hardening.sql", import.meta.url);

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("binds document metadata to the authoritative owner and object prefix", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /documents_storage_binding_check/i);
  assert.match(migration, /split_part\(storage_path, '\/', 1\) = user_id::text/i);
  assert.match(migration, /split_part\(storage_path, '\/', 2\) = id::text/i);
  assert.match(migration, /document\.storage_bucket = 'diarydock-documents'/i);
  assert.match(migration, /drop policy if exists "DiaryDock users can upload own document files"/i);
  assert.match(migration, /drop policy if exists "DiaryDock users can update own document files"/i);
});

test("enforces recent authentication inside direct access-management RPCs", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /from auth\.sessions as session/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'session_id'/i);
  for (const functionName of [
    "set_document_sharing",
    "create_household_invite",
    "create_household_role_invite",
    "cancel_household_invite",
    "renew_household_invite",
    "update_household_member_role",
    "remove_household_member",
    "rename_household",
    "leave_household",
    "create_trusted_emergency_contact",
    "set_emergency_access_grant",
    "revoke_trusted_emergency_contact",
    "request_account_deletion",
  ]) {
    assert.match(migration, new RegExp(`create function public\\.${functionName}\\(`, "i"));
  }
  assert.match(migration, /revoke all on function public\.set_document_sharing_without_recent_auth[\s\S]*from public, anon, authenticated/i);
});

test("deletion cascades personal Life OS rows but blocks cross-user household loss", async () => {
  const migration = await readFile(migrationPath, "utf8");
  for (const table of [
    "life_entities", "life_relationships", "provenance_records", "life_facts",
    "life_document_links", "life_events", "life_inbox_items", "permission_grants",
    "action_requests", "action_steps", "audit_events",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} add constraint [^;]+ on delete cascade`, "i"));
  }
  assert.match(migration, /households_owner_id_fkey[\s\S]*on delete restrict/i);

  const deletion = await source("../lib/account-deletion.ts");
  const preflight = deletion.indexOf('client.rpc("prepare_account_deletion"');
  const storageDelete = deletion.indexOf("removeStoragePrefix(client, DOCUMENT_BUCKET, userId)");
  assert.ok(preflight >= 0 && storageDelete > preflight);
  const followup = await source("../supabase/migrations/20260901221000_close_security_hardening_races.sql");
  assert.match(followup, /for update[\s\S]*other active members[\s\S]*delete from public\.households/i);
  assert.match(followup, /grant execute on function public\.prepare_account_deletion\(uuid\) to service_role/i);
});

test("keeps shared rate-limit writes behind the service role", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /revoke all on function public\.check_rate_limit\(text, integer, integer\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.check_rate_limit\(text, integer, integer\) to service_role/i);

  const serverLimiter = await source("../lib/rate-limit-server.ts");
  assert.match(serverLimiter, /getSupabaseAdminClient\(\)/);
  assert.match(serverLimiter, /process\.env\.NODE_ENV === "production"/);
  assert.match(serverLimiter, /checkSharedRateLimit\([^;]+"deny"\)/s);
});

test("routes browser and email uploads through byte inspection and the scanner boundary", async () => {
  const browserStorage = await source("../lib/document-storage.ts");
  assert.match(browserStorage, /fetch\("\/api\/documents\/uploads\/prepare"/);
  assert.match(browserStorage, /uploadToSignedUrl/);
  assert.match(browserStorage, /fetch\("\/api\/documents\/uploads\/commit"/);
  assert.doesNotMatch(browserStorage, /\.storage\.from\(DOCUMENT_BUCKET\)\.upload/);

  const commitRoute = await source("../app/api/documents/uploads/commit/route.ts");
  assert.match(commitRoute, /DOCUMENT_QUARANTINE_BUCKET/);
  assert.match(commitRoute, /inspectCaptureFile/);
  assert.match(commitRoute, /getCaptureSecurityScanner\(\)\.scan/);
  assert.match(commitRoute, /\.from\(DOCUMENT_BUCKET\)[\s\S]*\.upload/);

  const emailRoute = await source("../app/api/import/email/route.ts");
  assert.match(emailRoute, /hasCompleteResendSignature/);
  const emailPayload = await source("../lib/email-import/payload.ts");
  assert.match(emailPayload, /MAX_WEBHOOK_BYTES/);
  assert.match(emailPayload, /parseBoundedInboundMultipart\(request/);
  assert.match(emailPayload, /readBoundedStream\(response\.body, remainingBytes\)/);
  assert.match(emailPayload, /MAX_INBOUND_ATTACHMENT_BYTES - totalBytes/);
  assert.doesNotMatch(emailPayload, /response\.arrayBuffer\(\)/);
  assert.match(emailRoute, /checkServerRateLimit\(createRateLimitKey\("inbound-email", verifiedUserId\)/);
  const emailAttachment = await source("../lib/email-import/import-attachment.ts");
  assert.match(emailAttachment, /inspectCaptureFile\(\{ declaredMimeType: attachment\.mimeType, bytes \}\)/);
  assert.match(emailAttachment, /getCaptureSecurityScanner\(\)\.scan/);
});

test("records completed actions through one atomic service-only RPC", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const followup = await source("../supabase/migrations/20260904212000_action_proposal_service_boundary.sql");
  assert.match(migration, /audit_events_action_completed_unique_idx/i);
  assert.match(followup, /create or replace function public\.decide_action_request_server/i);
  assert.match(followup, /request\.user_id = input_user_id[\s\S]*request\.status = 'proposed'[\s\S]*for update/i);
  assert.match(followup, /sync_system_reminders_server[\s\S]*update public\.action_requests[\s\S]*insert into public\.audit_events/i);
  assert.match(followup, /finalize_action_request\(uuid,text,boolean\)[\s\S]*from public, anon, authenticated, service_role/i);

  const route = await source("../app/api/actions/proposals/route.ts");
  assert.match(route, /rpc\("decide_action_request_server"/);
  assert.doesNotMatch(route, /from\("audit_events"\)\.insert/);
});

test("does not permit unsafe eval in the production CSP", async () => {
  const config = await source("../next.config.ts");
  assert.match(config, /isDevelopment \? " 'unsafe-eval'" : ""/);
  assert.doesNotMatch(config, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
});
