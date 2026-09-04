import { NextResponse } from "next/server";

import { parseOfficeCorrespondenceDetailRequest,
  parseOfficeCorrespondenceMutation } from "@diarydock/office";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import {
  applyOfficeCorrespondenceMutation,
  loadOfficeCorrespondenceDetail,
  loadOfficeCorrespondenceSnapshot,
} from "@/lib/office/mobile-correspondence-server";
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
    throw new Error("Duplicate correspondence detail parameter.");
  }
  return parseOfficeCorrespondenceDetailRequest(Object.fromEntries(entries));
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-office-correspondence-read",
    request,
    route: "/api/mobile/office/correspondence",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Office correspondence is unavailable." },
      503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return respond(request, observation,
      { error: "Please sign in again to open Office correspondence." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:office-correspondence:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(request, observation,
      { error: "Office correspondence is busy. Try again shortly." }, 429, "rate-limited");
  }
  let detail;
  try { detail = detailRequest(request); }
  catch { return respond(request, observation,
    { error: "That correspondence detail request was not valid." }, 400, "invalid-query"); }
  if (detail) {
    const result = await loadOfficeCorrespondenceDetail(auth.supabase, auth.user.id,
      detail.correspondenceId);
    if (result.error === "UNAVAILABLE") return respond(request, observation,
      { error: "Correspondence details could not be refreshed." }, 503, "database-unavailable");
    if (!result.detail) return respond(request, observation,
      { error: "That correspondence is no longer available." }, 404, "not-found");
    return respond(request, observation, result.detail, 200, "detail-ok", 1);
  }
  const result = await loadOfficeCorrespondenceSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return respond(request, observation,
      { error: "Office correspondence could not be refreshed." }, 503, "database-unavailable");
  }
  return respond(request, observation, result.snapshot, 200, "ok",
    result.snapshot.correspondence.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-office-correspondence-write",
    request,
    route: "/api/mobile/office/correspondence",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Office correspondence is unavailable." },
      503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return respond(request, observation,
      { error: "Please sign in again to update Office correspondence." }, 401, "unauthenticated");
  }
  let mutation;
  try {
    mutation = parseOfficeCorrespondenceMutation(await readBoundedJson(request, 256 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation,
      { error: "That correspondence update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:office-correspondence:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(request, observation,
      { error: "Please wait before updating Office correspondence again." }, 429, "rate-limited");
  }
  if (!isSupabaseAdminConfigured()) {
    return respond(request, observation, { error: "Office correspondence is unavailable." }, 503, "admin-unavailable");
  }
  const result = await applyOfficeCorrespondenceMutation(
    auth.supabase, getSupabaseAdminClient(), auth.user.id, mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return respond(request, observation,
      { error: "Office correspondence could not be updated." }, 503, "database-unavailable");
  }
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "Office correspondence has reached its safe record limit.",
      CONFLICT: "Office correspondence changed on another device. Review the refreshed copy and try again.",
      NOT_FOUND: "That correspondence is no longer available.",
    } as const;
    return respond(request, observation,
      { error: errors[result.status], snapshot: result.snapshot },
      409, result.status.toLowerCase());
  }
  return respond(request, observation, result.snapshot, 200, "ok", 1);
}
