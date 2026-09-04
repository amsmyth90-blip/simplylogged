import { NextResponse } from "next/server";

import { parseGarageMutation } from "@diarydock/vehicles";

import {
  applyGarageMutation,
  loadGarageSnapshot,
} from "@/lib/garage/mobile-snapshot-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import {
  checkServerRateLimit,
  createRateLimitKey,
} from "@/lib/rate-limit-server";
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
    operation: "mobile-garage-read",
    request,
    route: "/api/mobile/garage",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(
      request,
      observation,
      { error: "The Garage is unavailable." },
      503,
      "auth-unavailable",
    );
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(
      request,
      observation,
      { error: "Please sign in again to open the Garage." },
      401,
      "unauthenticated",
    );
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:garage:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(
      request,
      observation,
      { error: "The Garage is busy. Try again shortly." },
      429,
      "rate-limited",
    );
  }
  const result = await loadGarageSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return response(
      request,
      observation,
      { error: "The Garage could not be refreshed." },
      503,
      "database-unavailable",
    );
  }
  return response(
    request,
    observation,
    result.snapshot,
    200,
    "ok",
    result.snapshot.vehicles.length,
  );
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-garage-write",
    request,
    route: "/api/mobile/garage",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(
      request,
      observation,
      { error: "The Garage is unavailable." },
      503,
      "auth-unavailable",
    );
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(
      request,
      observation,
      { error: "Please sign in again to update the Garage." },
      401,
      "unauthenticated",
    );
  }
  let mutation;
  try {
    mutation = parseGarageMutation(await readBoundedJson(request, 8 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(
      request,
      observation,
      { error: "That Garage update was not valid." },
      status,
      "invalid-body",
    );
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:garage:write", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(
      request,
      observation,
      { error: "Please wait before updating the Garage again." },
      429,
      "rate-limited",
    );
  }
  const result = await applyGarageMutation(
    auth.supabase,
    auth.user.id,
    mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return response(
      request,
      observation,
      { error: "The Garage could not be updated." },
      503,
      "database-unavailable",
    );
  }
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "The Garage has reached its safe record limit.",
      CONFLICT:
        "The Garage changed on another device. Review the refreshed records and try again.",
      NOT_FOUND: "That vehicle is no longer available.",
    } as const;
    return response(
      request,
      observation,
      { error: errors[result.status], snapshot: result.snapshot },
      409,
      result.status.toLowerCase(),
    );
  }
  return response(request, observation, result.snapshot, 200, "ok", 1);
}
