import { NextResponse } from "next/server";

import { SEARCH_SCHEMA_VERSION } from "@diarydock/search";

import { answerAuthorizedQuestion } from "@/lib/ask/answer-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { loadAuthorizedSearchCandidates } from "@/lib/search/authorized";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) return NextResponse.json({ error: "Ask DiaryDock is not configured." }, { status: 503, headers: privateHeaders });
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "Please sign in again to ask DiaryDock." }, { status: 401, headers: privateHeaders });

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request, 4_096) as Record<string, unknown>;
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "Send a valid question." }, { status, headers: privateHeaders });
  }
  if (Object.keys(body).some((key) => key !== "question")) {
    return NextResponse.json({ error: "The question contains unsupported fields." }, { status: 400, headers: privateHeaders });
  }
  const question = typeof body.question === "string"
    ? body.question.trim().replace(/\s+/g, " ")
    : "";
  if (question.length < 2 || question.length > 300) return NextResponse.json({ error: "Questions must be between 2 and 300 characters." }, { status: 400, headers: privateHeaders });

  const rateLimit = await checkServerRateLimit(createRateLimitKey("ask-diarydock", authData.user.id), { limit: 20, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: "Ask DiaryDock is busy. Please wait a moment and try again." }, { status: 429, headers: { ...privateHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) } });

  const authorized = await loadAuthorizedSearchCandidates(supabase, authData.user.id);
  if (authorized.error) return NextResponse.json({ error: "Ask DiaryDock could not safely load your records." }, { status: 500, headers: privateHeaders });
  const answer = await answerAuthorizedQuestion(authorized.candidates, question);

  try { await supabase.rpc("record_product_analytics_event", { input_event_name: "first_ai_question", input_properties: { surface: "ASK" } }); } catch { /* Analytics never blocks an answer. */ }

  return NextResponse.json({ schemaVersion: SEARCH_SCHEMA_VERSION, ...answer }, { headers: privateHeaders });
}
