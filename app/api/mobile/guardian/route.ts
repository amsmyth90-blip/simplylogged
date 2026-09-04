import { NextResponse } from "next/server";

import {
  GUARDIAN_SCHEMA_VERSION,
  type GuardianDecision,
} from "@diarydock/guardian";

import { decideGuardianFinding, loadGuardianBriefing } from "@/lib/guardian/service";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(
  request: Request,
  observation: RequestObservation,
  body: Record<string, unknown>,
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
    operation: "mobile-guardian-read",
    request,
    route: "/api/mobile/guardian",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return response(request, observation, { error: "Guardian is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return response(request, observation, { error: "Please sign in again to open Guardian." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:guardian:read", auth.user.id), {
    limit: 60,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) return response(request, observation, { error: "Guardian is busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadGuardianBriefing(auth.supabase, auth.user.id);
  if (result.error) return response(request, observation, { error: "Guardian could not refresh your briefing." }, 503, "database-unavailable");
  return response(request, observation, {
    schemaVersion: GUARDIAN_SCHEMA_VERSION,
    findings: result.findings,
  }, 200, "ok", result.findings.length);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-guardian-write",
    request,
    route: "/api/mobile/guardian",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return response(request, observation, { error: "Guardian is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user || !auth.supabase) return response(request, observation, { error: "Please sign in again to update Guardian." }, 401, "unauthenticated");
  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request, 2 * 1024) as Record<string, unknown>;
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "That Guardian choice was not valid." }, status, "invalid-body");
  }
  if (Object.keys(body).some((key) => key !== "findingId" && key !== "decision")) {
    return response(request, observation, { error: "That Guardian choice was not valid." }, 400, "invalid-fields");
  }
  const findingId = typeof body.findingId === "string" ? body.findingId : "";
  const decision = body.decision === "dismiss" || body.decision === "resolve" || body.decision === "snooze"
    ? body.decision as GuardianDecision
    : null;
  if (!uuidPattern.test(findingId) || !decision) return response(request, observation, { error: "That Guardian choice was not valid." }, 400, "invalid-choice");
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:guardian:write", auth.user.id), {
    limit: 40,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) return response(request, observation, { error: "Please wait before updating Guardian again." }, 429, "rate-limited");
  const result = await decideGuardianFinding(auth.supabase, auth.user.id, findingId, decision);
  if (result === "ERROR") return response(request, observation, { error: "That Guardian item could not be updated." }, 503, "database-unavailable");
  if (result === "MISSING") return response(request, observation, { error: "That Guardian item is no longer waiting." }, 409, "stale-finding");
  try {
    await auth.supabase.rpc("record_product_analytics_event", {
      input_event_name: "first_guardian_action",
      input_properties: { action: decision.toUpperCase() },
    });
  } catch { /* Content-free analytics never blocks a choice. */ }
  return response(request, observation, { ok: true }, 200, "ok");
}
