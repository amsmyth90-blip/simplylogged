import { NextResponse } from "next/server";

import { parseHomeHandoverDetailRequest,
  parseHomeHandoverMutation } from "@diarydock/home-handover";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import { applyHomeHandoverMutation, loadHomeHandoverDetail,
  loadHomeHandoverSnapshot } from "@/lib/home-handover-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function verifiedEmail(user: { email?: string; email_confirmed_at?: string }) {
  return user.email && user.email_confirmed_at ? user.email.trim().toLowerCase() : null;
}

function requestedDetail(request: Request) {
  const entries = [...new URL(request.url).searchParams.entries()];
  if (!entries.length) return null;
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    throw new Error("Duplicate Home Handover detail parameter.");
  }
  return parseHomeHandoverDetailRequest(Object.fromEntries(entries));
}

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string, records = 0) {
  const headers = mobileCorsHeaders(request);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) { return mobilePreflight(request); }

export async function GET(request: Request) {
  const observation = new RequestObservation({ operation: "home-handover-read", request,
    route: "/api/home-handover" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Home Handover is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user) return respond(request, observation,
    { error: "Please sign in again to open Home Handover." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("home-handover:read", auth.user.id),
    { limit: 90, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Home Handover is busy. Try again shortly." }, 429, "rate-limited");
  let detailRequest;
  try { detailRequest = requestedDetail(request); }
  catch { return respond(request, observation,
    { error: "That Home Handover detail request was not valid." }, 400, "invalid-query"); }
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Home Handover could not be refreshed." }, 503, "database-unavailable");
  if (detailRequest) {
    const result = await loadHomeHandoverDetail(getSupabaseAdminClient(), auth.user.id,
      verifiedEmail(auth.user), detailRequest);
    if (result.error === "UNAVAILABLE") return respond(request, observation,
      { error: "Home Handover details could not be refreshed." }, 503, "database-unavailable");
    if (!result.detail) return respond(request, observation,
      { error: "That Home Handover item is no longer available." }, 404, "not-found");
    return respond(request, observation, result.detail, 200, "detail-ok", 1);
  }
  const result = await loadHomeHandoverSnapshot(getSupabaseAdminClient(), auth.user.id,
    verifiedEmail(auth.user));
  if (!result.snapshot) return respond(request, observation,
    { error: "Home Handover could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok",
    result.snapshot.candidates.length + result.snapshot.items.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "home-handover-write", request,
    route: "/api/home-handover" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Home Handover is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user) return respond(request, observation,
    { error: "Please sign in again to change Home Handover." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("home-handover:write", auth.user.id),
    { limit: 40, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before changing Home Handover again." }, 429, "rate-limited");
  if (!hasRecentAuthentication(auth.user.last_sign_in_at)) return respond(request, observation,
    { error: "For your security, please sign in again before changing a handover draft.",
      code: "RECENT_AUTH_REQUIRED" }, 403, "recent-auth-required");
  let mutation;
  try { mutation = parseHomeHandoverMutation(await readBoundedJson(request, 4 * 1024)); }
  catch (error) { return respond(request, observation,
    { error: "That Home Handover change was not valid." },
    error instanceof RequestBodyError ? error.status : 400, "invalid-body"); }
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Home Handover could not be updated." }, 503, "database-unavailable");
  const result = await applyHomeHandoverMutation(getSupabaseAdminClient(), auth.user.id,
    verifiedEmail(auth.user), mutation);
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "Home Handover could not be updated." }, 503, "database-unavailable");
  if (result.status === "RECENT_AUTH_REQUIRED") return respond(request, observation,
    { error: "For your security, please sign in again before changing a handover draft.",
      code: "RECENT_AUTH_REQUIRED" }, 403, "recent-auth-required");
  if (result.status === "INVALID_RECIPIENT") return respond(request, observation,
    { error: "Enter another person's valid email address." }, 400, "invalid-recipient");
  if (result.status === "TOO_LARGE") return respond(request, observation,
    { error: "This handover is too large to share safely." }, 413, "too-large");
  if (result.status !== "OK" && result.status !== "EXISTS") {
    const messages = { CONFLICT: "Home Handover changed on another device. Review the latest copy.",
      CAPACITY: "This handover draft has reached its 200-item safety limit.",
      NOT_FOUND: "That handover draft is no longer available.",
      INVALID_REFERENCE: "That item is no longer eligible for Home Handover.",
      EMPTY: "Select at least one item before sharing Home Handover." } as const;
    return respond(request, observation, { error: messages[result.status], snapshot: result.snapshot },
      409, result.status.toLowerCase());
  }
  return respond(request, observation, result.snapshot,
    mutation.operation === "CREATE_PACK" && result.status === "OK" ? 201 : 200,
    result.status.toLowerCase(), 1);
}
