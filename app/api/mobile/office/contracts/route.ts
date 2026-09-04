import { NextResponse } from "next/server";

import { parseOfficeContractDetailRequest,
  parseOfficeContractMutation } from "@diarydock/office";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import {
  applyOfficeContractMutation,
  loadOfficeContractDetail,
  loadOfficeContractsSnapshot,
} from "@/lib/office/mobile-contracts-server";
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
    throw new Error("Duplicate contract detail parameter.");
  }
  return parseOfficeContractDetailRequest(Object.fromEntries(entries));
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-office-contracts-read", request, route: "/api/mobile/office/contracts",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Office contracts are unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return respond(request, observation, { error: "Please sign in again to open Office contracts." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:office-contracts:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(request, observation, { error: "Office contracts are busy. Try again shortly." }, 429, "rate-limited");
  }
  let detail;
  try { detail = detailRequest(request); }
  catch { return respond(request, observation,
    { error: "That contract detail request was not valid." }, 400, "invalid-query"); }
  if (detail) {
    const result = await loadOfficeContractDetail(auth.supabase, auth.user.id, detail.contractId);
    if (result.error === "UNAVAILABLE") return respond(request, observation,
      { error: "Office contract details could not be refreshed." }, 503, "database-unavailable");
    if (!result.detail) return respond(request, observation,
      { error: "That contract is no longer available." }, 404, "not-found");
    return respond(request, observation, result.detail, 200, "detail-ok", 1);
  }
  const result = await loadOfficeContractsSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return respond(request, observation, { error: "Office contracts could not be refreshed." }, 503, "database-unavailable");
  }
  return respond(request, observation, result.snapshot, 200, "ok", result.snapshot.contracts.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-office-contracts-write", request, route: "/api/mobile/office/contracts",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Office contracts are unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return respond(request, observation, { error: "Please sign in again to update Office contracts." }, 401, "unauthenticated");
  }
  let mutation;
  try {
    mutation = parseOfficeContractMutation(await readBoundedJson(request, 24 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation, { error: "That contract update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:office-contracts:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(request, observation, { error: "Please wait before updating Office contracts again." }, 429, "rate-limited");
  }
  if (!isSupabaseAdminConfigured()) {
    return respond(request, observation, { error: "Office contracts are unavailable." }, 503, "admin-unavailable");
  }
  const result = await applyOfficeContractMutation(
    auth.supabase, getSupabaseAdminClient(), auth.user.id, mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return respond(request, observation, { error: "Office contracts could not be updated." }, 503, "database-unavailable");
  }
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "Office contracts have reached their safe record limit.",
      CONFLICT: "Office contracts changed on another device. Review the refreshed copy and try again.",
      NOT_FOUND: "That contract is no longer available.",
    } as const;
    return respond(request, observation, { error: errors[result.status], snapshot: result.snapshot },
      409, result.status.toLowerCase());
  }
  return respond(request, observation, result.snapshot, 200, "ok", 1);
}
