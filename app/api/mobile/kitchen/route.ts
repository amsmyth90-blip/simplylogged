import { NextResponse } from "next/server";

import { parseKitchenMutation } from "@diarydock/kitchen";

import { applyKitchenMutation, loadKitchenSnapshot } from "@/lib/kitchen/snapshot-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

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
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-kitchen-read",
    request,
    route: "/api/mobile/kitchen",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "The Kitchen is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to open the Kitchen." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:kitchen:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "The Kitchen is busy. Try again shortly." }, 429, "rate-limited");
  }
  const result = await loadKitchenSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return response(request, observation, { error: "The Kitchen could not be refreshed." }, 503, "database-unavailable");
  }
  return response(request, observation, result.snapshot, 200, "ok", result.snapshot.items.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-kitchen-write",
    request,
    route: "/api/mobile/kitchen",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "The Kitchen is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to update the Kitchen." }, 401, "unauthenticated");
  }
  let mutation;
  try {
    mutation = parseKitchenMutation(await readBoundedJson(request, 2 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "That Kitchen update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:kitchen:write", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "Please wait before updating the Kitchen again." }, 429, "rate-limited");
  }
  if (!isSupabaseAdminConfigured()) {
    return response(request, observation, { error: "The Kitchen could not be updated." },
      503, "database-unavailable");
  }
  const result = await applyKitchenMutation(auth.supabase, getSupabaseAdminClient(),
    auth.user.id, mutation);
  if (result.status === "ERROR" || !result.snapshot) {
    return response(request, observation, { error: "The Kitchen could not be updated." }, 503, "database-unavailable");
  }
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "The Kitchen list has reached its safe item limit.",
      CONFLICT: "The Kitchen changed on another device. Review the refreshed list and try again.",
      DUPLICATE: "That item is already in this list.",
      NOT_FOUND: "That Kitchen item no longer exists.",
    } as const;
    return response(request, observation, {
      error: errors[result.status],
      snapshot: result.snapshot,
    }, 409, result.status.toLowerCase());
  }
  return response(request, observation, result.snapshot, 200, "ok", 1);
}
