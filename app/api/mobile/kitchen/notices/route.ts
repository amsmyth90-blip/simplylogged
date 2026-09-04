import { NextResponse } from "next/server";

import { parseKitchenNoticeMutation } from "@diarydock/kitchen";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { applyKitchenNoticeMutation, loadKitchenNoticeboard } from "@/lib/kitchen/notice-server";
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
    operation: "mobile-kitchen-notices-read",
    request,
    route: "/api/mobile/kitchen/notices",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "The noticeboard is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to open the noticeboard." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:kitchen:notices:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "The noticeboard is busy. Try again shortly." }, 429, "rate-limited");
  }
  const result = await loadKitchenNoticeboard(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return response(request, observation, { error: "The noticeboard could not be refreshed." }, 503, "database-unavailable");
  }
  return response(request, observation, result.snapshot, 200, "ok", result.snapshot.notices.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-kitchen-notices-write",
    request,
    route: "/api/mobile/kitchen/notices",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "The noticeboard is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to update the noticeboard." }, 401, "unauthenticated");
  }
  let mutation;
  try {
    mutation = parseKitchenNoticeMutation(await readBoundedJson(request, 4 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "That noticeboard update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:kitchen:notices:write", auth.user.id),
    { limit: 40, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(request, observation, { error: "Please wait before updating the noticeboard again." }, 429, "rate-limited");
  }
  if (!isSupabaseAdminConfigured()) {
    return response(request, observation, { error: "The noticeboard is unavailable." }, 503, "admin-unavailable");
  }
  const result = await applyKitchenNoticeMutation(
    auth.supabase, getSupabaseAdminClient(), auth.user.id, mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return response(request, observation, { error: "The noticeboard could not be updated." }, 503, "database-unavailable");
  }
  if (result.status !== "OK") {
    const error = result.status === "CAPACITY"
      ? "The noticeboard has reached its safe item limit."
      : result.status === "NOT_FOUND"
        ? "That notice no longer exists."
        : "The noticeboard changed on another device. Review it and try again.";
    return response(request, observation, { error, snapshot: result.snapshot }, 409,
      result.status.toLowerCase());
  }
  return response(request, observation, result.snapshot, 200, "ok", 1);
}
