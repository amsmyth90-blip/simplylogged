import { NextResponse } from "next/server";

import { parseSyncPullResponse, SYNC_API_VERSION } from "@diarydock/contracts";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { SyncObservation } from "@/lib/observability/sync-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateApiRequest } from "@/lib/supabase/request";
import { decodeSyncCursor, encodeSyncCursor, syncCursorSecret } from "@/lib/sync/cursor";
import { projectionSequence, projectionToSyncRecord } from "@/lib/sync/record";

export const runtime = "nodejs";

const PAGE_SIZE = 250;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const observation = new SyncObservation("pull", request);
  const headers = mobileCorsHeaders(request);
  const auth = await authenticateApiRequest(request);
  if (auth.error === "UNAVAILABLE") {
    observation.finish(headers, { outcome: "auth-unavailable", status: 503 });
    return NextResponse.json({ error: "Secure sync is unavailable." }, { status: 503, headers });
  }
  if (auth.error || !auth.user || !auth.supabase) {
    observation.finish(headers, { outcome: "unauthenticated", status: 401 });
    return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
  }

  const rate = await checkServerRateLimit(createRateLimitKey("sync:pull", auth.user.id), {
    limit: 180,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfterSeconds));
    observation.finish(headers, { outcome: "rate-limited", status: 429 });
    return NextResponse.json({ error: "Sync is busy. Try again shortly." }, { status: 429, headers });
  }

  let secret: string;
  try {
    secret = syncCursorSecret();
  } catch {
    observation.finish(headers, { outcome: "cursor-secret-unavailable", status: 503 });
    return NextResponse.json({ error: "Secure sync is unavailable." }, { status: 503, headers });
  }

  const membershipResult = await auth.supabase
    .from("household_memberships")
    .select("household_id,joined_at")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (membershipResult.error) {
    observation.finish(headers, { outcome: "membership-unavailable", status: 503 });
    return NextResponse.json({ error: "DiaryDock could not verify household access." }, { status: 503, headers });
  }
  const membership = membershipResult.data as null | { household_id?: unknown; joined_at?: unknown };
  if (membership && (
    typeof membership.household_id !== "string"
    || !uuidPattern.test(membership.household_id)
    || typeof membership.joined_at !== "string"
    || !Number.isFinite(Date.parse(membership.joined_at))
  )) {
    observation.finish(headers, { outcome: "invalid-membership", status: 503 });
    return NextResponse.json({ error: "DiaryDock received an invalid household membership." }, { status: 503, headers });
  }
  const activeHouseholdId = membership?.household_id ?? null;
  const scopeKey = membership ? `${membership.household_id}:${membership.joined_at}` : null;

  let sequence: bigint;
  try {
    sequence = decodeSyncCursor(
      new URL(request.url).searchParams.get("cursor"),
      auth.user.id,
      secret,
      scopeKey,
    );
  } catch {
    observation.finish(headers, { outcome: "invalid-cursor", status: 400 });
    return NextResponse.json({ error: "The sync cursor is invalid." }, { status: 400, headers });
  }

  const { data, error } = await auth.supabase
    .from("sync_records")
    .select("record_id,entity_type,scope_kind,scope_id,revision,schema_version,updated_at,deleted_at,payload,change_sequence")
    .gt("change_sequence", sequence.toString())
    .order("change_sequence", { ascending: true })
    .order("record_id", { ascending: true })
    .limit(PAGE_SIZE + 1);
  if (error) {
    observation.finish(headers, { outcome: "database-unavailable", status: 503 });
    return NextResponse.json({ error: "DiaryDock could not read sync changes." }, { status: 503, headers });
  }

  try {
    const rows = (data ?? []) as unknown as Parameters<typeof projectionToSyncRecord>[0][];
    const page = rows.slice(0, PAGE_SIZE);
    const records = page.map(projectionToSyncRecord);
    const nextSequence = page.length ? projectionSequence(page[page.length - 1]!) : sequence;
    const response = parseSyncPullResponse({
      apiVersion: SYNC_API_VERSION,
      records,
      nextCursor: encodeSyncCursor(nextSequence, auth.user.id, secret, scopeKey),
      hasMore: rows.length > PAGE_SIZE,
      activeHouseholdId,
    });
    observation.finish(headers, { outcome: "ok", records: records.length, status: 200 });
    return NextResponse.json(response, { headers });
  } catch {
    observation.finish(headers, { outcome: "invalid-database-response", status: 503 });
    return NextResponse.json({ error: "DiaryDock received an invalid sync record." }, { status: 503, headers });
  }
}
