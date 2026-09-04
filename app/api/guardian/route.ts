import { NextResponse } from "next/server";

import { GUARDIAN_SCHEMA_VERSION, type GuardianDecision } from "@diarydock/guardian";

import { decideGuardianFinding, loadGuardianBriefing } from "@/lib/guardian/service";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

async function authenticate() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function GET() {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: "Please sign in again to open Guardian." }, { status: 401, headers: privateHeaders });
  const rate = await checkServerRateLimit(createRateLimitKey("guardian:read", auth.user.id), { limit: 60, windowMs: 5 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Guardian is busy. Try again shortly." }, { status: 429, headers: privateHeaders });
  const result = await loadGuardianBriefing(auth.supabase, auth.user.id);
  if (result.error) return NextResponse.json({ error: "Guardian could not refresh your briefing just now." }, { status: 503, headers: privateHeaders });
  return NextResponse.json({ schemaVersion: GUARDIAN_SCHEMA_VERSION, findings: result.findings }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: "Please sign in again to update Guardian." }, { status: 401, headers: privateHeaders });
  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request, 2 * 1024) as Record<string, unknown>;
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "That Guardian choice was not valid." }, { status, headers: privateHeaders });
  }
  if (Object.keys(body).some((key) => key !== "findingId" && key !== "decision")) {
    return NextResponse.json({ error: "That Guardian choice was not valid." }, { status: 400, headers: privateHeaders });
  }
  const findingId = typeof body.findingId === "string" ? body.findingId : "";
  const decision = body.decision === "dismiss" || body.decision === "resolve" || body.decision === "snooze"
    ? body.decision as GuardianDecision
    : null;
  if (!uuidPattern.test(findingId) || !decision) {
    return NextResponse.json({ error: "That Guardian choice was not valid." }, { status: 400, headers: privateHeaders });
  }
  const rate = await checkServerRateLimit(createRateLimitKey("guardian:write", auth.user.id), { limit: 40, windowMs: 5 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Please wait before updating Guardian again." }, { status: 429, headers: privateHeaders });
  const result = await decideGuardianFinding(auth.supabase, auth.user.id, findingId, decision);
  if (result === "ERROR") return NextResponse.json({ error: "That Guardian item could not be updated." }, { status: 503, headers: privateHeaders });
  if (result === "MISSING") return NextResponse.json({ error: "That Guardian item is no longer waiting." }, { status: 409, headers: privateHeaders });
  try {
    await auth.supabase.rpc("record_product_analytics_event", {
      input_event_name: "first_guardian_action",
      input_properties: { action: decision.toUpperCase() },
    });
  } catch { /* Content-free analytics never blocks a choice. */ }
  return NextResponse.json({ ok: true }, { headers: privateHeaders });
}
