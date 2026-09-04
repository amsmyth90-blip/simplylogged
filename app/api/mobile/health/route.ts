import { NextResponse } from "next/server";

import { parseHealthMutation } from "@diarydock/health";

import {
  applyHealthMutation,
  loadHealthSnapshot,
} from "@/lib/health/mobile-snapshot-server";
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
  headers.set("Cache-Control", "private, no-store");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-health-read",
    request,
    route: "/api/mobile/health",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(
      request,
      observation,
      { error: "My Health is unavailable." },
      503,
      "auth-unavailable",
    );
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(
      request,
      observation,
      { error: "Please sign in again to open My Health." },
      401,
      "unauthenticated",
    );
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:health:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(
      request,
      observation,
      { error: "My Health is busy. Try again shortly." },
      429,
      "rate-limited",
    );
  }
  const result = await loadHealthSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) {
    return response(
      request,
      observation,
      { error: "My Health could not be refreshed." },
      503,
      "database-unavailable",
    );
  }
  const records = Object.values(result.snapshot.counts).reduce(
    (total, count) => total + count,
    0,
  );
  return response(request, observation, result.snapshot, 200, "ok", records);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-health-write",
    request,
    route: "/api/mobile/health",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(
      request,
      observation,
      { error: "My Health is unavailable." },
      503,
      "auth-unavailable",
    );
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(
      request,
      observation,
      { error: "Please sign in again to update My Health." },
      401,
      "unauthenticated",
    );
  }
  let mutation;
  try {
    mutation = parseHealthMutation(
      await readBoundedJson(request, 32 * 1024),
    );
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(
      request,
      observation,
      { error: "That health update was not valid." },
      status,
      "invalid-body",
    );
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:health:write", auth.user.id),
    { limit: 40, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(
      request,
      observation,
      { error: "Please wait before updating My Health again." },
      429,
      "rate-limited",
    );
  }
  const result = await applyHealthMutation(
    auth.supabase,
    auth.user.id,
    mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return response(
      request,
      observation,
      { error: "The health update could not be saved." },
      503,
      "database-unavailable",
    );
  }
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "This health area has reached its safe record limit.",
      CONFLICT:
        "My Health changed on another device. Review the refreshed records and try again.",
      DUPLICATE: "A different health record already uses that identifier.",
      INVALID_REFERENCE:
        "A linked family profile or healthcare contact is no longer available.",
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
