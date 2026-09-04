import { NextResponse } from "next/server";

import { parseEmergencyMutation } from "@diarydock/emergency";

import {
  applyEmergencyMutation,
  loadEmergencySnapshot,
} from "@/lib/emergency/snapshot-server";
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
    operation: "mobile-emergency-read",
    request,
    route: "/api/mobile/emergency",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "Emergency information is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to open Emergency." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:emergency:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "Emergency is busy. Try again shortly." }, 429, "rate-limited");
  }
  const result = await loadEmergencySnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return response(request, observation, { error: "Emergency information could not be refreshed." }, 503, "database-unavailable");
  }
  const count = result.snapshot.contacts.length + result.snapshot.plans.length
    + result.snapshot.homeInfo.length + result.snapshot.careContacts.length;
  return response(request, observation, result.snapshot, 200, "ok", count);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-emergency-write",
    request,
    route: "/api/mobile/emergency",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "Emergency information is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to update Emergency." }, 401, "unauthenticated");
  }
  let mutation;
  try {
    mutation = parseEmergencyMutation(await readBoundedJson(request, 8 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "That Emergency update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:emergency:write", auth.user.id),
    { limit: 40, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "Please wait before updating Emergency again." }, 429, "rate-limited");
  }
  if (!isSupabaseAdminConfigured()) {
    return response(request, observation, { error: "Emergency information is unavailable." }, 503, "admin-unavailable");
  }
  const result = await applyEmergencyMutation(
    auth.supabase, getSupabaseAdminClient(), auth.user.id, mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return response(request, observation, { error: "Emergency information could not be updated." }, 503, "database-unavailable");
  }
  if (result.status === "CAPACITY") {
    return response(request, observation, {
      error: "This Emergency section has reached its safe item limit.",
      snapshot: result.snapshot,
    }, 409, "capacity");
  }
  if (result.status === "CONFLICT") {
    return response(request, observation, {
      error: "Emergency changed on another device. Review the refreshed information and try again.",
      snapshot: result.snapshot,
    }, 409, "revision-conflict");
  }
  return response(request, observation, result.snapshot, 200, "ok", 1);
}
