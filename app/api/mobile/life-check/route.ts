import { NextResponse } from "next/server";

import { parseLifeCheckMutation } from "@diarydock/life-check";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { applyLifeCheckMutation, loadLifeCheckSnapshot } from "@/lib/life-check/mobile-life-check-server";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string, records = 0) {
  const headers = mobileCorsHeaders(request); headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) { return mobilePreflight(request); }

export async function GET(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-life-check-read", request,
    route: "/api/mobile/life-check" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Life Check is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to open Life Check." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:life-check:read", auth.user.id),
    { limit: 90, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Life Check is busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadLifeCheckSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) return respond(request, observation,
    { error: "Life Check could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok", result.snapshot.categories.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-life-check-write", request,
    route: "/api/mobile/life-check" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Life Check is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to update Life Check." }, 401, "unauthenticated");
  let mutation;
  try { mutation = parseLifeCheckMutation(await readBoundedJson(request, 4 * 1024)); }
  catch (error) { return respond(request, observation,
    { error: "That Life Check answer was not valid." },
    error instanceof RequestBodyError ? error.status : 400, "invalid-body"); }
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:life-check:write", auth.user.id),
    { limit: 40, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before changing Life Check again." }, 429, "rate-limited");
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Life Check could not be updated." }, 503, "database-unavailable");
  const result = await applyLifeCheckMutation(auth.supabase, getSupabaseAdminClient(),
    auth.user.id, mutation);
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "Life Check could not be updated." }, 503, "database-unavailable");
  if (result.status === "CONFLICT") return respond(request, observation,
    { error: "Life Check changed on another device. The latest answers are now shown.",
      snapshot: result.snapshot }, 409, "conflict");
  return respond(request, observation, result.snapshot, 200, "ok", 1);
}
