import { NextResponse } from "next/server";

import {
  parseSyncPushRequest,
  parseSyncPushResponse,
} from "@diarydock/contracts";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { SyncObservation } from "@/lib/observability/sync-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/supabase/request";

export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 512 * 1024;

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function POST(request: Request) {
  const observation = new SyncObservation("push", request);
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

  const rate = await checkServerRateLimit(createRateLimitKey("sync:push", auth.user.id), {
    limit: 120,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfterSeconds));
    observation.finish(headers, { outcome: "rate-limited", status: 429 });
    return NextResponse.json({ error: "Sync is busy. Try again shortly." }, { status: 429, headers });
  }

  let body;
  try {
    body = parseSyncPushRequest(await readBoundedJson(request, MAXIMUM_BODY_BYTES));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    observation.finish(headers, { outcome: "invalid-request", status });
    return NextResponse.json({ error: "The sync request is invalid." }, { status, headers });
  }

  if (!isSupabaseAdminConfigured()) {
    observation.finish(headers, { outcome: "database-unavailable", status: 503 });
    return NextResponse.json({ error: "Secure sync is unavailable." }, { status: 503, headers });
  }
  const { data, error } = await getSupabaseAdminClient().rpc("apply_sync_mutations_server", {
    input_user_id: auth.user.id,
    request_body: body,
  });
  if (error) {
    observation.finish(headers, { outcome: "database-unavailable", status: 503 });
    return NextResponse.json({ error: "DiaryDock could not apply sync changes." }, { status: 503, headers });
  }
  try {
    const response = parseSyncPushResponse(data);
    observation.finish(headers, {
      outcome: "ok",
      records: response.results.length,
      status: 200,
    });
    return NextResponse.json(response, { headers });
  } catch {
    observation.finish(headers, { outcome: "invalid-database-response", status: 503 });
    return NextResponse.json({ error: "DiaryDock received an invalid sync result." }, { status: 503, headers });
  }
}
