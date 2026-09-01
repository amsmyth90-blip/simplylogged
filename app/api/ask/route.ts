import { NextResponse } from "next/server";

import { createAskAnswer } from "@/lib/ask/openai";
import { deterministicAskAnswer, retrieveAskCitations } from "@/lib/ask/retrieval";
import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { loadAuthorizedSearchCandidates } from "@/lib/search/authorized";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) return NextResponse.json({ error: "Ask DiaryDock is not configured." }, { status: 503, headers: privateHeaders });
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "Please sign in again to ask DiaryDock." }, { status: 401, headers: privateHeaders });

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > 4_096) return NextResponse.json({ error: "That question is too large." }, { status: 413, headers: privateHeaders });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid question." }, { status: 400, headers: privateHeaders }); }
  const question = typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).question === "string"
    ? (body as Record<string, string>).question.trim().replace(/\s+/g, " ")
    : "";
  if (question.length < 2 || question.length > 300) return NextResponse.json({ error: "Questions must be between 2 and 300 characters." }, { status: 400, headers: privateHeaders });

  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("ask-diarydock", authData.user.id), { limit: 20, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: "Ask DiaryDock is busy. Please wait a moment and try again." }, { status: 429, headers: { ...privateHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) } });

  const authorized = await loadAuthorizedSearchCandidates(supabase, authData.user.id);
  if (authorized.error) return NextResponse.json({ error: "Ask DiaryDock could not safely load your records." }, { status: 500, headers: privateHeaders });
  const citations = retrieveAskCitations(authorized.candidates, question);
  if (!citations.length) return NextResponse.json({ answer: deterministicAskAnswer([]), citations: [], usedAI: false }, { headers: privateHeaders });

  let answer = deterministicAskAnswer(citations);
  let cited = citations;
  let usedAI = false;
  if (process.env.OPENAI_API_KEY) {
    try {
      const generated = await createAskAnswer({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_TEXT_MODEL || "gpt-5", question, citations });
      const allowedRefs = new Set(generated.citationRefs);
      const verified = citations.filter((citation) => allowedRefs.has(citation.ref));
      if (generated.answer.trim() && verified.length) {
        answer = generated.answer.trim();
        cited = verified;
        usedAI = true;
      }
    } catch {
      // The deterministic answer preserves availability without widening retrieval or logging private content.
    }
  }

  try { await supabase.rpc("record_product_analytics_event", { input_event_name: "first_ai_question", input_properties: { surface: "ASK" } }); } catch { /* Analytics never blocks an answer. */ }

  return NextResponse.json({ answer, citations: cited.map((citation) => ({ id: citation.id, category: citation.category, title: citation.title, detail: citation.detail, href: citation.href, dueAt: citation.dueAt, badge: citation.badge })), usedAI }, { headers: privateHeaders });
}
