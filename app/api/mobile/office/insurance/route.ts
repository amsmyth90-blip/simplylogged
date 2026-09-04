import { NextResponse } from "next/server";

import { parseOfficeInsuranceDetailRequest,
  parseOfficeInsuranceMutation } from "@diarydock/office";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import {
  applyOfficeInsuranceMutation,
  loadOfficeInsuranceDetail,
  loadOfficeInsuranceSnapshot,
} from "@/lib/office/mobile-insurance-server";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(
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

function detailRequest(request: Request) {
  const entries = [...new URL(request.url).searchParams.entries()];
  if (!entries.length) return null;
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    throw new Error("Duplicate insurance detail parameter.");
  }
  return parseOfficeInsuranceDetailRequest(Object.fromEntries(entries));
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-office-insurance-read",
    request,
    route: "/api/mobile/office/insurance",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Office insurance is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return respond(request, observation, { error: "Please sign in again to open Office insurance." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:office-insurance:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(request, observation, { error: "Office insurance is busy. Try again shortly." }, 429, "rate-limited");
  }
  let detail;
  try { detail = detailRequest(request); }
  catch { return respond(request, observation,
    { error: "That insurance detail request was not valid." }, 400, "invalid-query"); }
  if (detail) {
    const result = await loadOfficeInsuranceDetail(auth.supabase, auth.user.id,
      detail.resourceType, detail.resourceId);
    if (result.error === "UNAVAILABLE") return respond(request, observation,
      { error: "Insurance details could not be refreshed." }, 503, "database-unavailable");
    if (!result.detail) return respond(request, observation,
      { error: "That insurance record is no longer available." }, 404, "not-found");
    return respond(request, observation, result.detail, 200, "detail-ok", 1);
  }
  const result = await loadOfficeInsuranceSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return respond(request, observation, { error: "Office insurance could not be refreshed." }, 503, "database-unavailable");
  }
  return respond(
    request,
    observation,
    result.snapshot,
    200,
    "ok",
    result.snapshot.policies.length + result.snapshot.claims.length,
  );
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-office-insurance-write",
    request,
    route: "/api/mobile/office/insurance",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Office insurance is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return respond(request, observation, { error: "Please sign in again to update Office insurance." }, 401, "unauthenticated");
  }
  let mutation;
  try {
    mutation = parseOfficeInsuranceMutation(await readBoundedJson(request, 32 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation, { error: "That insurance update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:office-insurance:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(request, observation, { error: "Too many insurance updates. Try again shortly." }, 429, "rate-limited");
  }
  if (!isSupabaseAdminConfigured()) {
    return respond(request, observation, { error: "Office insurance is unavailable." }, 503, "admin-unavailable");
  }
  const result = await applyOfficeInsuranceMutation(
    auth.supabase, getSupabaseAdminClient(), auth.user.id, mutation,
  );
  if (result.status === "CONFLICT") {
    return respond(request, observation, { error: "Office changed on another device.", snapshot: result.snapshot }, 409, "conflict");
  }
  if (result.status === "NOT_FOUND" || result.status === "INVALID_REFERENCE") {
    return respond(request, observation, { error: "That policy or claim is no longer available." }, 404, "not-found");
  }
  if (result.status === "CAPACITY") {
    return respond(request, observation, { error: "The Office insurance limit has been reached." }, 409, "capacity");
  }
  if (result.status !== "OK" || !result.snapshot) {
    return respond(request, observation, { error: "The insurance update could not be saved." }, 503, "database-unavailable");
  }
  return respond(
    request,
    observation,
    result.snapshot,
    200,
    "ok",
    result.snapshot.policies.length + result.snapshot.claims.length,
  );
}
