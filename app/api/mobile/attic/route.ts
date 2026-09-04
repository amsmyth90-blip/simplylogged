import { NextResponse } from "next/server";

import { parseAtticMutation } from "@diarydock/attic";

import {
  applyAtticMutation,
  loadAtticSnapshot,
} from "@/lib/attic/mobile-snapshot-server";
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

function storyCursor(request: Request) {
  const values = new URL(request.url).searchParams.getAll("cursor");
  if (!values.length) return { cursor: null, valid: true } as const;
  const cursor = values[0]!.trim();
  return {
    cursor,
    valid: values.length === 1 && cursor.length > 0 && cursor.length <= 128,
  } as const;
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-attic-read",
    request,
    route: "/api/mobile/attic",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(
      request,
      observation,
      { error: "The Attic is unavailable." },
      503,
      "auth-unavailable",
    );
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(
      request,
      observation,
      { error: "Please sign in again to open the Attic." },
      401,
      "unauthenticated",
    );
  }
  const page = storyCursor(request);
  if (!page.valid) {
    return response(
      request,
      observation,
      { error: "That Attic page was not valid." },
      400,
      "invalid-cursor",
    );
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:attic:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(
      request,
      observation,
      { error: "The Attic is busy. Try again shortly." },
      429,
      "rate-limited",
    );
  }
  const result = await loadAtticSnapshot(
    auth.supabase,
    auth.user.id,
    page.cursor,
  );
  if (!result.snapshot) {
    return response(
      request,
      observation,
      { error: "The Attic could not be refreshed." },
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
    result.snapshot.stories.length,
  );
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-attic-write",
    request,
    route: "/api/mobile/attic",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(
      request,
      observation,
      { error: "The Attic is unavailable." },
      503,
      "auth-unavailable",
    );
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(
      request,
      observation,
      { error: "Please sign in again to update the Attic." },
      401,
      "unauthenticated",
    );
  }
  let mutation;
  try {
    mutation = parseAtticMutation(await readBoundedJson(request, 32 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(
      request,
      observation,
      { error: "That family story was not valid." },
      status,
      "invalid-body",
    );
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:attic:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(
      request,
      observation,
      { error: "Please wait before updating the Attic again." },
      429,
      "rate-limited",
    );
  }
  const result = await applyAtticMutation(
    auth.supabase,
    auth.user.id,
    mutation,
  );
  if (result.status === "ERROR" || !result.snapshot) {
    return response(
      request,
      observation,
      { error: "The family story could not be saved." },
      503,
      "database-unavailable",
    );
  }
  if (result.status !== "OK") {
    const errors = {
      CAPACITY: "The Attic has reached its safe family story limit.",
      CONFLICT:
        "The Attic changed on another device. Review the refreshed stories and try again.",
      DUPLICATE: "A different family story already uses that identifier.",
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
