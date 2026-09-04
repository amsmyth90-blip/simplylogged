import { NextResponse } from "next/server";

import { parseMailboxMutation } from "@diarydock/mailbox";

import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { applyMailboxMutation, loadMailboxSnapshot } from "@/lib/mailbox/mobile-server";
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

export function OPTIONS(request: Request) { return mobilePreflight(request); }

export async function GET(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-mailbox-read",
    request, route: "/api/mobile/mailbox" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Mailbox is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to open Mailbox." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:mailbox:read", auth.user.id),
    { limit: 60, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Mailbox is busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadMailboxSnapshot(auth.supabase, auth.user.id);
  if (!result.snapshot) return respond(request, observation,
    { error: "Mailbox could not be refreshed." }, 503, "database-unavailable");
  return respond(request, observation, result.snapshot, 200, "ok", result.snapshot.items.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-mailbox-write",
    request, route: "/api/mobile/mailbox" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Mailbox is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return respond(request, observation,
    { error: "Please sign in again to update Mailbox." }, 401, "unauthenticated");
  let mutation;
  try {
    mutation = parseMailboxMutation(await readBoundedJson(request, 4 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation, { error: "That Mailbox choice was not valid." },
      status, "invalid-body");
  }
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:mailbox:write", auth.user.id),
    { limit: 40, windowMs: 5 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Please wait before updating Mailbox again." }, 429, "rate-limited");
  if (!isSupabaseAdminConfigured()) return respond(request, observation,
    { error: "Mailbox could not be updated." }, 503, "database-unavailable");
  const result = await applyMailboxMutation(auth.supabase, getSupabaseAdminClient(),
    auth.user.id, mutation);
  if (result.status === "ERROR" || !result.snapshot) return respond(request, observation,
    { error: "Mailbox could not be updated." }, 503, "database-unavailable");
  if (result.status !== "OK") {
    const errors = { CONFLICT: "That item changed on another device. Review the refreshed copy.",
      NOT_FOUND: "That item is no longer available.", INVALID_REFERENCE: "The original file is no longer available.",
      INVALID: "That Mailbox choice was not valid." } as const;
    return respond(request, observation, { error: errors[result.status], snapshot: result.snapshot },
      result.status === "INVALID" ? 400 : 409, result.status.toLowerCase());
  }
  return respond(request, observation, result.snapshot, 200, "ok", 1);
}
