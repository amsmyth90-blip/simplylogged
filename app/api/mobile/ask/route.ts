import { NextResponse } from "next/server";

import { SEARCH_SCHEMA_VERSION } from "@diarydock/search";

import { answerAuthorizedQuestion } from "@/lib/ask/answer-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { loadAuthorizedSearchCandidates } from "@/lib/search/authorized";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-ask",
    request,
    route: "/api/mobile/ask",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "Ask DiaryDock is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to ask DiaryDock." }, 401, "unauthenticated");
  }

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request, 4 * 1024) as Record<string, unknown>;
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(request, observation, { error: "Send a valid question." }, status, "invalid-body");
  }
  if (Object.keys(body).some((key) => key !== "question")) {
    return response(request, observation, { error: "The question contains unsupported fields." }, 400, "invalid-fields");
  }
  const question = typeof body.question === "string"
    ? body.question.trim().replace(/\s+/g, " ")
    : "";
  if (question.length < 2 || question.length > 300) {
    return response(request, observation, { error: "Questions must be between 2 and 300 characters." }, 400, "invalid-question");
  }

  const rate = await checkServerRateLimit(createRateLimitKey("mobile:ask", auth.user.id), {
    limit: 20,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    const result = response(request, observation, { error: "Ask DiaryDock is busy. Try again shortly." }, 429, "rate-limited");
    result.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return result;
  }

  const authorized = await loadAuthorizedSearchCandidates(auth.supabase, auth.user.id);
  if (authorized.error) {
    return response(request, observation, { error: "Ask DiaryDock could not safely load your records." }, 503, "database-unavailable");
  }
  const answer = await answerAuthorizedQuestion(authorized.candidates, question);
  try {
    await auth.supabase.rpc("record_product_analytics_event", {
      input_event_name: "first_ai_question",
      input_properties: { surface: "MOBILE_ASK" },
    });
  } catch {
    // Content-free analytics never blocks an answer.
  }
  return response(request, observation, {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    ...answer,
  }, 200, "ok", answer.citations.length);
}
