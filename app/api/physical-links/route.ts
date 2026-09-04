import { NextResponse } from "next/server";

import { parsePhysicalAssetDetailRequest,
  parsePhysicalLinksMutation } from "@diarydock/physical-links";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { applyPhysicalLinksMutation, loadPhysicalAssetDetail,
  loadPhysicalLinksSnapshot } from "@/lib/physical-links-server";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string, records = 0) {
  const headers = mobileCorsHeaders(request); headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) { return mobilePreflight(request); }

function detailRequest(request: Request) {
  const entries = [...new URL(request.url).searchParams.entries()];
  if (!entries.length) return null;
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    throw new Error("Duplicate Physical Link detail parameter.");
  }
  return parsePhysicalAssetDetailRequest(Object.fromEntries(entries));
}

export async function GET(request: Request) {
  const observation = new RequestObservation({ operation: "physical-links-read", request,
    route: "/api/physical-links" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Physical Links is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to open Physical Links." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("physical-links:read", auth.user.id),
    { limit: 90, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Physical Links is busy. Try again shortly." }, 429, "rate-limited");
  let detail;
  try { detail = detailRequest(request); }
  catch { return respond(request, observation,
    { error: "That Physical Link detail request was not valid." }, 400, "invalid-query"); }
  if (detail) {
    const result = await loadPhysicalAssetDetail(auth.supabase, auth.user.id, detail.assetId);
    if (result.error === "UNAVAILABLE") return respond(request, observation,
      { error: "Physical Link details could not be refreshed." }, 503, "database-unavailable");
    if (!result.detail) return respond(request, observation,
      { error: "That household item is no longer available." }, 404, "not-found");
    return respond(request, observation, result.detail, 200, "detail-ok", 1);
  }
  const result = await loadPhysicalLinksSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) return respond(request, observation,
    { error: "Physical Links could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok",
    result.snapshot.assets.length + result.snapshot.links.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "physical-links-write", request,
    route: "/api/physical-links" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Physical Links is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to manage Physical Links." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("physical-links:write", auth.user.id),
    { limit: 50, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before changing Physical Links again." }, 429, "rate-limited");
  let mutation;
  try { mutation = parsePhysicalLinksMutation(await readBoundedJson(request, 16 * 1024)); }
  catch (error) { const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation, { error: "That Physical Links change was not valid." },
      status, "invalid-body"); }
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Physical Links could not be updated." }, 503, "database-unavailable");
  const result = await applyPhysicalLinksMutation(auth.supabase, getSupabaseAdminClient(),
    auth.user.id, mutation);
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "Physical Links could not be updated." }, 503, "database-unavailable");
  if (result.status !== "OK") {
    const messages = { CONFLICT: "Physical Links changed on another device. Review the refreshed copy.",
      CAPACITY: "This account has reached the Physical Links safety limit.",
      NOT_FOUND: "That tag is no longer available.",
      INVALID_REFERENCE: "The linked item is no longer available." } as const;
    return respond(request, observation, { error: messages[result.status], snapshot: result.snapshot },
      409, result.status.toLowerCase());
  }
  return respond(request, observation, { snapshot: result.snapshot, newLink: result.newLink },
    200, "ok", 1);
}
