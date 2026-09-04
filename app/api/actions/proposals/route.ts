import { NextResponse } from "next/server";

import {
  MAX_PROPOSAL_DECISION_BYTES,
  parseProposalDecision,
} from "@/lib/actions/proposal-decision";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const route = "/api/actions/proposals";

function respond(
  observation: RequestObservation,
  body: unknown,
  status: number,
  outcome: string,
  records?: number,
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function authorize(request: Request, operation: string, limit: number) {
  const observation = new RequestObservation({ operation, request, route });
  if (!isSupabaseConfiguredServer()) {
    return { response: respond(observation, { error: "Suggestions are unavailable." }, 503, "auth-unavailable") };
  }
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { response: respond(observation, { error: "Please sign in again." }, 401, "unauthenticated") };
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey(`actions:proposals:${operation}`, data.user.id),
    { limit, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return { response: respond(observation, { error: "Please wait before reviewing suggestions again." }, 429, "rate-limited") };
  }
  return { observation, supabase, userId: data.user.id };
}

export async function GET(request: Request) {
  const auth = await authorize(request, "read", 90);
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase
    .from("action_requests")
    .select("id, action_type, risk_level, status, title, summary, reason, proposed_payload, source_document_id, created_at")
    .eq("user_id", auth.userId)
    .in("status", ["proposed", "approved"])
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    return respond(auth.observation, { error: "Suggestions could not be loaded." }, 503, "database-unavailable");
  }
  const proposals = data ?? [];
  return respond(auth.observation, { proposals }, 200, "ok", proposals.length);
}

export async function POST(request: Request) {
  const originObservation = new RequestObservation({ operation: "decide", request, route });
  if (!sameOrigin(request)) {
    return respond(originObservation, { error: "Request origin was not accepted." }, 403, "invalid-origin");
  }
  const auth = await authorize(request, "decide", 30);
  if ("response" in auth) return auth.response;
  let decision;
  try {
    decision = parseProposalDecision(
      await readBoundedJson(request, MAX_PROPOSAL_DECISION_BYTES),
    );
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(auth.observation, { error: "That suggestion decision was not valid." }, status, "invalid-request");
  }

  if (!isSupabaseAdminConfigured()) {
    return respond(auth.observation, { error: "Secure suggestions are unavailable." }, 503, "admin-unavailable");
  }
  const { data, error } = await getSupabaseAdminClient()
    .rpc("decide_action_request_server", {
      input_user_id: auth.userId,
      input_action_request_id: decision.proposalId,
      input_decision: decision.decision,
    }).maybeSingle();
  if (error) {
    return respond(auth.observation, { error: "That suggestion could not be updated." }, 503, "database-unavailable");
  }
  if (!data) {
    return respond(auth.observation, { error: "That suggestion is no longer waiting for a decision." }, 409, "proposal-unavailable");
  }
  return respond(auth.observation, { proposal: data }, 200, "ok", 1);
}
