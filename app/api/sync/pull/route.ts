import { NextResponse } from "next/server";

import { parseSyncPullResponse, SYNC_API_VERSION } from "@diarydock/contracts";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { SyncObservation } from "@/lib/observability/sync-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateSyncApiRequest } from "@/lib/supabase/request";
import {
  decodeSyncCursor,
  decodeSyncCursorSequence,
  encodeSyncCursor,
  syncCursorSecret,
} from "@/lib/sync/cursor";
import {
  projectionSequence,
  projectionToSyncRecord,
  type SyncProjectionRow,
} from "@/lib/sync/record";

export const runtime = "nodejs";

const PAGE_SIZE = 250;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class SyncPullUnavailableError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePullPage(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.records)) {
    throw new Error("The sync page is invalid.");
  }
  const householdId = value.active_household_id;
  const joinedAt = value.household_joined_at;
  if (householdId === null && joinedAt === null) {
    return { activeHouseholdId: null, rows: value.records as SyncProjectionRow[], scopeKey: null };
  }
  if (typeof householdId !== "string" || !uuidPattern.test(householdId)
    || typeof joinedAt !== "string" || !Number.isFinite(Date.parse(joinedAt))) {
    throw new Error("The sync membership is invalid.");
  }
  return {
    activeHouseholdId: householdId,
    rows: value.records as SyncProjectionRow[],
    scopeKey: `${householdId}:${joinedAt}`,
  };
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const observation = new SyncObservation("pull", request);
  const headers = mobileCorsHeaders(request);
  const auth = await authenticateSyncApiRequest(request);
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
  if (rate.unavailable) {
    observation.finish(headers, { outcome: "rate-limit-unavailable", status: 503 });
    return NextResponse.json({ error: "Secure sync is temporarily unavailable." }, { status: 503, headers });
  }
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

  const cursor = new URL(request.url).searchParams.get("cursor");
  let sequence: bigint;
  try {
    sequence = decodeSyncCursorSequence(cursor, auth.user.id, secret);
  } catch {
    observation.finish(headers, { outcome: "invalid-cursor", status: 400 });
    return NextResponse.json({ error: "The sync cursor is invalid." }, { status: 400, headers });
  }

  const loadPage = (after: bigint) => auth.supabase.rpc("pull_sync_page", {
    input_after_sequence: after.toString(),
    input_limit: PAGE_SIZE + 1,
  });

  try {
    let result = await loadPage(sequence);
    if (result.error) throw new SyncPullUnavailableError("The sync database is unavailable.");
    let pulled = parsePullPage(result.data);
    let scopedSequence = decodeSyncCursor(cursor, auth.user.id, secret, pulled.scopeKey);

    // Membership changes deliberately reset a cursor. Repeat from zero only on
    // that uncommon transition; normal pulls remain a single database call.
    if (scopedSequence !== sequence) {
      sequence = scopedSequence;
      result = await loadPage(sequence);
      if (result.error) throw new SyncPullUnavailableError("The sync database is unavailable.");
      pulled = parsePullPage(result.data);
      scopedSequence = decodeSyncCursor(cursor, auth.user.id, secret, pulled.scopeKey);
      if (scopedSequence !== sequence) throw new Error("The sync membership changed during the request.");
    }

    const rows = pulled.rows;
    const page = rows.slice(0, PAGE_SIZE);
    const records = page.map(projectionToSyncRecord);
    const nextSequence = page.length ? projectionSequence(page[page.length - 1]!) : sequence;
    const response = parseSyncPullResponse({
      apiVersion: SYNC_API_VERSION,
      records,
      nextCursor: encodeSyncCursor(nextSequence, auth.user.id, secret, pulled.scopeKey),
      hasMore: rows.length > PAGE_SIZE,
      activeHouseholdId: pulled.activeHouseholdId,
    });
    observation.finish(headers, { outcome: "ok", records: records.length, status: 200 });
    return NextResponse.json(response, { headers });
  } catch (error) {
    if (error instanceof SyncPullUnavailableError) {
      observation.finish(headers, { outcome: "database-unavailable", status: 503 });
      return NextResponse.json({ error: "DiaryDock could not read sync changes." }, { status: 503, headers });
    }
    observation.finish(headers, { outcome: "invalid-database-response", status: 503 });
    return NextResponse.json({ error: "DiaryDock received an invalid sync record." }, { status: 503, headers });
  }
}
