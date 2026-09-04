import { NextResponse } from "next/server";

import { parseOnboardingMutation } from "@diarydock/onboarding";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import {
  applyOnboardingMutation,
  loadOnboardingSnapshot,
} from "@/lib/onboarding/mobile-onboarding-server";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string) {
  const headers = mobileCorsHeaders(request); headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { status, headers });
}
function profileName(user: { user_metadata: Record<string, unknown> }) {
  const value = user.user_metadata.full_name ?? user.user_metadata.name
    ?? user.user_metadata.given_name;
  return typeof value === "string" ? value : "";
}

export function OPTIONS(request: Request) { return mobilePreflight(request); }

export async function GET(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-onboarding-read", request,
    route: "/api/mobile/onboarding" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Setup is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to open setup." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:onboarding:read", auth.user.id),
    { limit: 90, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Setup is busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadOnboardingSnapshot(auth.supabase, auth.user.id, profileName(auth.user));
  if (!result.snapshot) return respond(request, observation,
    { error: "Setup could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok");
}

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-onboarding-write", request,
    route: "/api/mobile/onboarding" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Setup is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to save setup." }, 401, "unauthenticated");
  let mutation;
  try { mutation = parseOnboardingMutation(await readBoundedJson(request, 8 * 1024)); }
  catch (error) { return respond(request, observation, { error: "That setup was not valid." },
    error instanceof RequestBodyError ? error.status : 400, "invalid-body"); }
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:onboarding:write", auth.user.id),
    { limit: 12, windowMs: 15 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before saving setup again." }, 429, "rate-limited");
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Setup could not be saved." }, 503, "database-unavailable");
  const result = await applyOnboardingMutation(auth.supabase, getSupabaseAdminClient(), auth.user.id,
    mutation, profileName(auth.user));
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "Setup could not be saved." }, 503, "database-unavailable");
  if (result.status === "CONFLICT") return respond(request, observation,
    { error: "Setup changed on another device. The latest choices are now shown.",
      snapshot: result.snapshot }, 409, "conflict");
  return respond(request, observation, result.snapshot, 200, "ok");
}
