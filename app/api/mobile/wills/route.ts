import { NextResponse } from "next/server";

import { parseWillsMutation } from "@diarydock/wills";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";
import { applyWillsMutation, loadWillsSnapshot } from "@/lib/wills/mobile-snapshot-server";

export const runtime = "nodejs";

function response(
  request: Request,
  observation: RequestObservation,
  body: unknown,
  status: number,
  outcome: string,
  records = 0,
) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-wills-read", request, route: "/api/mobile/wills",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return response(request, observation, { error: "The Safe Room is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return response(request, observation, { error: "Please sign in again to open the Safe Room." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:wills:read", auth.user.id), { limit: 60, windowMs: 5 * 60_000 });
  if (!rate.allowed) return response(request, observation, { error: "The Safe Room is busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadWillsSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) return response(request, observation, { error: "The Safe Room could not be refreshed." }, 503, "database-unavailable");
  return response(request, observation, result.snapshot, 200, "ok", result.snapshot.counts.letters + result.snapshot.counts.versions);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-wills-write", request, route: "/api/mobile/wills",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return response(request, observation, { error: "The Safe Room is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return response(request, observation, { error: "Please sign in again to update the Safe Room." }, 401, "unauthenticated");
  let mutation;
  try {
    mutation = parseWillsMutation(await readBoundedJson(request, 128 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "That Safe Room update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:wills:write", auth.user.id), { limit: 30, windowMs: 5 * 60_000 });
  if (!rate.allowed) return response(request, observation, { error: "Please wait before updating the Safe Room again." }, 429, "rate-limited");
  if (!isSupabaseAdminConfigured()) return response(request, observation, { error: "The Safe Room is unavailable." }, 503, "admin-unavailable");
  const result = await applyWillsMutation(
    auth.supabase, getSupabaseAdminClient(), auth.user.id, mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) return response(request, observation, { error: "The Safe Room update could not be saved." }, 503, "database-unavailable");
  if (result.status !== "OK") {
    const messages = {
      CAPACITY: "This Safe Room area has reached its safe record limit.",
      CONFLICT: "The Safe Room changed on another device. Review the refreshed records and try again.",
      DUPLICATE: "A different Safe Room record already uses that identifier.",
      INVALID_REFERENCE: "A linked file is unavailable or does not belong in the Safe Room.",
      NOT_FOUND: "That Safe Room record is no longer available.",
    } as const;
    return response(request, observation, { error: messages[result.status], snapshot: result.snapshot }, 409, result.status.toLowerCase());
  }
  return response(request, observation, result.snapshot, 200, "ok", 1);
}
