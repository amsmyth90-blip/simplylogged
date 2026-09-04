import { NextResponse } from "next/server";

import { parseTravelMutation } from "@diarydock/travel";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";
import { applyTravelMutation, loadTravelSnapshot } from "@/lib/travel/mobile-server";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string, records = 0) {
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
    operation: "mobile-travel-read", request, route: "/api/mobile/travel",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "The Driveway is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to open the Driveway." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:travel:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "The Driveway is busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadTravelSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) return respond(request, observation,
    { error: "The Driveway could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok", result.snapshot.trips.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-travel-write", request, route: "/api/mobile/travel",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "The Driveway is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to update the Driveway." }, 401, "unauthenticated");
  let mutation;
  try {
    mutation = parseTravelMutation(await readBoundedJson(request, 32 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation,
      { error: "That travel update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:travel:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before updating the Driveway again." }, 429, "rate-limited");
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "The Driveway could not be updated." }, 503, "database-unavailable");
  const result = await applyTravelMutation(auth.supabase, getSupabaseAdminClient(),
    auth.user.id, mutation);
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "The Driveway could not be updated." }, 503, "database-unavailable");
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "The Driveway has reached its safe record limit.",
      CONFLICT: "The Driveway changed on another device. Review the refreshed copy and try again.",
      INVALID_REFERENCE: "That travel update refers to a record that is no longer available.",
      NOT_FOUND: "That travel record is no longer available.",
    } as const;
    return respond(request, observation, { error: errors[result.status], snapshot: result.snapshot },
      409, result.status.toLowerCase());
  }
  return respond(request, observation, result.snapshot, 200, "ok", 1);
}
