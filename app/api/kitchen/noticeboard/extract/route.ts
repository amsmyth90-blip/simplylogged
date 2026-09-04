import { NextResponse } from "next/server";

import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { readNoticeCaptureInput } from "@/lib/kitchen/notice-capture-input";
import { extractKitchenNotice } from "@/lib/kitchen/notice-extraction";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "kitchen-notice-capture",
    request,
    route: "/api/kitchen/noticeboard/extract",
  });
  if (!process.env.OPENAI_API_KEY) {
    return respond(request, observation, { error: "Smart notice capture is not configured yet." }, 503, "unavailable");
  }
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Smart notice capture is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user) {
    return respond(request, observation, { error: "Please sign in again to capture a notice." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(createRateLimitKey("api:kitchen:notice-capture", auth.user.id), {
    limit: 18,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    const result = respond(request, observation,
      { error: "Too many smart notice captures. Please wait a moment and try again." }, 429, "rate-limited");
    result.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return result;
  }
  const capture = await readNoticeCaptureInput(request);
  if (!capture.ok) {
    return respond(request, observation, { error: capture.error }, capture.status, "invalid-capture");
  }
  try {
    const result = await extractKitchenNotice(capture.input);
    return respond(request, observation, result, 200, "ok");
  } catch {
    return respond(request, observation,
      { error: "The notice could not be prepared securely right now." }, 503, "provider-failure");
  }
}
