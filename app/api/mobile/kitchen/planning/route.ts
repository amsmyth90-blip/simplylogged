import { NextResponse } from "next/server";

import { parseKitchenPlanningMutation } from "@diarydock/kitchen";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import {
  applyKitchenPlanningMutation,
  loadKitchenRecipeDetail,
  loadKitchenPlanningSnapshot,
} from "@/lib/kitchen/planning-server";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string, records = 0) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

function requestedRecipe(request: Request) {
  const values = new URL(request.url).searchParams.getAll("recipeId");
  if (!values.length) return { recipeId: null, valid: true } as const;
  const recipeId = values[0]!.trim();
  return {
    recipeId,
    valid: values.length === 1 && recipeId.length > 0 && recipeId.length <= 128,
  } as const;
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-kitchen-planning-read", request,
    route: "/api/mobile/kitchen/planning",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Kitchen planning is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to open Kitchen planning." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:kitchen-planning:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) return respond(request, observation,
    { error: "Kitchen planning is busy. Try again shortly." }, 429, "rate-limited");
  const requested = requestedRecipe(request);
  if (!requested.valid) return respond(request, observation,
    { error: "That recipe request was not valid." }, 400, "invalid-recipe");
  if (requested.recipeId) {
    const result = await loadKitchenRecipeDetail(
      auth.supabase,
      auth.user.id,
      requested.recipeId,
    );
    if (result.error) return respond(request, observation,
      { error: "The recipe could not be refreshed." }, 503, "database-unavailable");
    if (!result.detail) return respond(request, observation,
      { error: "That recipe is no longer available." }, 404, "not-found");
    return respond(request, observation, result.detail, 200, "recipe-ok", 1);
  }
  const result = await loadKitchenPlanningSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) return respond(request, observation,
    { error: "Kitchen planning could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok",
    result.snapshot.recipes.length + result.snapshot.meals.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-kitchen-planning-write", request,
    route: "/api/mobile/kitchen/planning",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Kitchen planning is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to update Kitchen planning." }, 401, "unauthenticated");
  let mutation;
  try {
    mutation = parseKitchenPlanningMutation(await readBoundedJson(request, 384 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation,
      { error: "That Kitchen planning update was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:kitchen-planning:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before updating Kitchen planning again." }, 429, "rate-limited");
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Kitchen planning could not be updated." }, 503, "database-unavailable");
  const result = await applyKitchenPlanningMutation(auth.supabase, getSupabaseAdminClient(),
    auth.user.id, mutation);
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "Kitchen planning could not be updated." }, 503, "database-unavailable");
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "Kitchen planning has reached its safe record limit.",
      CONFLICT: "Kitchen planning changed on another device. Review the refreshed copy and try again.",
      INVALID_REFERENCE: "That update refers to a recipe that is no longer available.",
      NOT_FOUND: "That recipe is no longer available.",
    } as const;
    return respond(request, observation,
      { error: errors[result.status], snapshot: result.snapshot }, 409,
      result.status.toLowerCase());
  }
  return respond(request, observation,
    { snapshot: result.snapshot, addedCount: result.addedCount }, 200, "ok", 1);
}
