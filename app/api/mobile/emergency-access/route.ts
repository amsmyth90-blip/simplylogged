import { NextResponse } from "next/server";

import {
  EMERGENCY_ACCESS_SCHEMA_VERSION,
  parseEmergencyAccessMutation,
} from "@diarydock/emergency-access";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import {
  loadEmergencyAccessDirectory,
  mutateEmergencyAccess,
} from "@/lib/emergency-access/service";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
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
    operation: "mobile-emergency-access-read",
    request,
    route: "/api/mobile/emergency-access",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "Trusted access is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to open trusted access." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:emergency-access:read", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "Trusted access is busy. Try again shortly." }, 429, "rate-limited");
  }
  const result = await loadEmergencyAccessDirectory(auth.supabase, auth.user.id);
  if (!result.directory) {
    return response(request, observation, { error: "Trusted access could not be loaded safely." }, 503, "database-unavailable");
  }
  return response(request, observation, {
    schemaVersion: EMERGENCY_ACCESS_SCHEMA_VERSION,
    directory: result.directory,
  }, 200, "ok", result.directory.contacts.length + result.directory.received.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-emergency-access-write",
    request,
    route: "/api/mobile/emergency-access",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "Trusted access is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to change trusted access." }, 401, "unauthenticated");
  }
  if (!hasRecentAuthentication(auth.user.last_sign_in_at)) {
    return response(request, observation, {
      code: "RECENT_AUTH_REQUIRED",
      error: "For your security, sign in again before changing trusted access.",
    }, 403, "recent-auth-required");
  }
  let mutation;
  try {
    mutation = parseEmergencyAccessMutation(await readBoundedJson(request, 8 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "That trusted-access update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:emergency-access:write", auth.user.id),
    { limit: 20, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "Please wait before changing trusted access again." }, 429, "rate-limited");
  }
  const mutationResult = await mutateEmergencyAccess(auth.supabase, mutation);
  if (mutationResult.error) {
    return response(request, observation, { error: "That trusted-access change was not accepted." }, 409, "rejected");
  }
  const result = await loadEmergencyAccessDirectory(auth.supabase, auth.user.id);
  if (!result.directory) {
    return response(request, observation, { error: "The change was saved, but trusted access could not refresh." }, 503, "refresh-unavailable");
  }
  return response(request, observation, {
    schemaVersion: EMERGENCY_ACCESS_SCHEMA_VERSION,
    directory: result.directory,
    ...(mutationResult.invitePath ? { invitePath: mutationResult.invitePath } : {}),
  }, 200, "ok", 1);
}
