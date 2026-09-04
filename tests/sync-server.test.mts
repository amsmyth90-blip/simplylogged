import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readBoundedJson, RequestBodyError } from "../lib/http/bounded-json.ts";
import { mobileCorsHeaders, mobilePreflight } from "../lib/http/mobile-cors.ts";
import { decodeSyncCursor, encodeSyncCursor } from "../lib/sync/cursor-codec.ts";

const secret = "0123456789abcdef0123456789abcdef";
const subject = "9e152506-4667-42e8-84df-47a87956aef9";
const otherSubject = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const scopeKey = "a62adcc2-c83a-4a91-b00d-dedc0850d672:2026-09-04T12:00:00.000Z";
const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sync cursors are opaque, authenticated and bounded", () => {
  const cursor = encodeSyncCursor(BigInt(42), subject, secret);
  assert.equal(cursor.includes("42"), false);
  assert.equal(decodeSyncCursor(cursor, subject, secret), BigInt(42));
  assert.throws(() => decodeSyncCursor(cursor, otherSubject, secret), /cursor is invalid/);
  const tampered = `${cursor.slice(0, -1)}${cursor.endsWith("a") ? "b" : "a"}`;
  assert.throws(() => decodeSyncCursor(tampered, subject, secret), /cursor is invalid/);
  assert.throws(() => encodeSyncCursor(BigInt(-1), subject, secret), /sequence is invalid/);
  assert.throws(() => encodeSyncCursor(BigInt(1), subject, "short"), /not configured securely/);

  const householdCursor = encodeSyncCursor(BigInt(90), subject, secret, scopeKey);
  assert.equal(decodeSyncCursor(householdCursor, subject, secret, scopeKey), BigInt(90));
  assert.equal(decodeSyncCursor(householdCursor, subject, secret, `${scopeKey}:new`), BigInt(0));
  assert.equal(decodeSyncCursor(householdCursor, subject, secret, null), BigInt(0));
});

test("bounded JSON rejects wrong content types and streamed oversized bodies", async () => {
  const valid = new Request("https://diarydock.com/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  });
  assert.deepEqual(await readBoundedJson(valid, 100), { ok: true });

  const wrongType = new Request("https://diarydock.com/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });
  await assert.rejects(() => readBoundedJson(wrongType, 100), (error: unknown) =>
    error instanceof RequestBodyError && error.status === 415);

  const misleadingType = new Request("https://diarydock.com/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "application/jsonp" },
    body: JSON.stringify({ ok: true }),
  });
  await assert.rejects(() => readBoundedJson(misleadingType, 100), (error: unknown) =>
    error instanceof RequestBodyError && error.status === 415);

  const oversized = new Request("https://diarydock.com/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(200) }),
  });
  await assert.rejects(() => readBoundedJson(oversized, 50), (error: unknown) =>
    error instanceof RequestBodyError && error.status === 413);
});

test("mobile CORS admits only installed and first-party origins", () => {
  const installed = new Request("https://diarydock.com/api/sync/pull", {
    method: "OPTIONS",
    headers: { Origin: "capacitor://localhost" },
  });
  assert.equal(mobileCorsHeaders(installed).get("Access-Control-Allow-Origin"), "capacitor://localhost");
  assert.match(
    mobileCorsHeaders(installed).get("Access-Control-Expose-Headers") ?? "",
    /X-Request-Id/,
  );
  assert.equal(mobilePreflight(installed).status, 204);

  const hostile = new Request("https://diarydock.com/api/sync/pull", {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(mobileCorsHeaders(hostile).has("Access-Control-Allow-Origin"), false);
  assert.equal(mobilePreflight(hostile).status, 403);
});

test("the server sync projection is owner-derived, bounded and tombstone-preserving", async () => {
  const [foundation, validation, mutation, maintenance, boundary, contraction, pushRoute, pullRoute, observation, requestObservation] = await Promise.all([
    read("supabase/migrations/20260901233000_sync_projection_foundation.sql"),
    read("supabase/migrations/20260901233100_sync_contract_validation.sql"),
    read("supabase/migrations/20260901233200_sync_mutation_rpc.sql"),
    read("supabase/migrations/20260901233300_sync_maintenance.sql"),
    read("supabase/migrations/20260902150000_secure_sync_mutation_boundary.sql"),
    read("supabase/migrations/20260902151000_revoke_legacy_sync_mutations.sql"),
    read("app/api/sync/push/route.ts"),
    read("app/api/sync/pull/route.ts"),
    read("lib/observability/sync-observation.ts"),
    read("lib/observability/request-observation.ts"),
  ]);
  assert.match(foundation, /owner_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(foundation, /revision = revision \+ 1/);
  assert.match(foundation, /deleted_at = timezone\('utc', now\(\)\)/);
  assert.match(foundation, /revoke all on table public\.sync_records from public, anon, authenticated/);
  assert.match(validation, /is_valid_reminder_sync_payload/);
  assert.match(validation, /is_valid_system_reminder_completion/);
  assert.match(mutation, /current_user_id uuid := auth\.uid\(\)/);
  assert.doesNotMatch(mutation, /ownerId/);
  assert.match(mutation, /on conflict do nothing/);
  assert.match(mutation, /operation = 'DELETE'[\s\S]*origin' = 'SYSTEM_GENERATED'[\s\S]*'FORBIDDEN'/);
  assert.match(mutation, /is_valid_system_reminder_completion\(current_record\.payload, payload\)/);
  assert.match(maintenance, /limit 10000/);
  assert.match(maintenance, /diarydock-sync-idempotency-cleanup/);
  assert.match(maintenance, /diarydock-cron-history-cleanup/);
  assert.match(boundary, /pg_advisory_xact_lock/);
  assert.match(boundary, /rate_count > 120/);
  assert.match(boundary, /active_count \+ incoming_count > 10000/);
  assert.match(boundary, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(boundary, /revoke all on function public\.apply_sync_mutations_core/);
  assert.match(boundary, /grant execute on function public\.apply_sync_mutations_server[\s\S]*to service_role/);
  assert.match(contraction, /revoke all on function public\.apply_sync_mutations\(jsonb\)[\s\S]*authenticated/);
  assert.match(pushRoute, /readBoundedJson/);
  assert.match(pushRoute, /SyncObservation/);
  assert.match(pushRoute, /getSupabaseAdminClient/);
  assert.match(pushRoute, /apply_sync_mutations_server/);
  assert.match(pushRoute, /input_user_id: auth\.user\.id/);
  assert.match(pullRoute, /decodeSyncCursor/);
  assert.match(pullRoute, /household_memberships/);
  assert.match(pullRoute, /activeHouseholdId/);
  assert.doesNotMatch(pullRoute, /\.eq\("owner_id"/);
  assert.match(requestObservation, /DIARYDOCK_OBSERVABILITY_SAMPLE_RATE/);
  assert.doesNotMatch(`${observation}\n${requestObservation}`, /userId|accessToken|payload|cursor/);
});
