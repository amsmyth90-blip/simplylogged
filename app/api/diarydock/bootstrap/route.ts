import { NextResponse } from "next/server";

import type {
  DiaryDockAppState,
  DiaryDockBootstrapPayload,
  HouseholdState,
} from "@/lib/diarydock-data";
import { loadDiaryDockRecordPage } from "@/lib/diarydock-record-page-server";
import { loadHouseholdDirectory } from "@/lib/household/directory-server";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function respond(observation: RequestObservation, body: unknown, status: number, outcome: string) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { status, headers });
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "desktop-bootstrap-read", request, route: "/api/diarydock/bootstrap",
  });
  if (!isSupabaseConfiguredServer()) {
    return respond(observation, { error: "Secure sync is not configured." }, 503, "auth-unavailable");
  }
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return respond(observation, { error: "Please sign in again to load DiaryDock." }, 401, "unauthenticated");
  }
  const userId = authData.user.id;
  const rate = await checkServerRateLimit(
    createRateLimitKey("desktop:bootstrap:read", userId),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(observation, { error: "DiaryDock is busy. Try again shortly." }, 429, "rate-limited");
  }
  const { data: householdId, error: householdError } = await supabase.rpc("ensure_user_household");
  if (householdError || !householdId) {
    return respond(observation, { error: "Your household could not be loaded." }, 503, "household-unavailable");
  }
  const [privateResult, sharedResult, household, documentResult, reminderResult] = await Promise.all([
    supabase.from("app_state").select("payload,updated_at").eq("id", userId).maybeSingle(),
    supabase.from("household_state").select("payload,updated_at")
      .eq("household_id", householdId).maybeSingle(),
    loadHouseholdDirectory(supabase, userId),
    loadDiaryDockRecordPage(supabase, userId, "documents", null),
    loadDiaryDockRecordPage(supabase, userId, "reminders", null),
  ]);
  if (privateResult.error || sharedResult.error || !household
    || !documentResult.page || !reminderResult.page) {
    return respond(observation, { error: "DiaryDock data could not be loaded securely." }, 503, "database-unavailable");
  }
  const payload: DiaryDockBootstrapPayload = {
    userId,
    privateRevision: privateResult.data?.updated_at
      ? String(privateResult.data.updated_at) : null,
    privateState: privateResult.data?.payload
      ? privateResult.data.payload as DiaryDockAppState : null,
    householdRevision: sharedResult.data?.updated_at
      ? String(sharedResult.data.updated_at) : null,
    householdState: sharedResult.data?.payload
      ? sharedResult.data.payload as Partial<HouseholdState> : null,
    household,
    documents: documentResult.page.documents,
    reminders: reminderResult.page.reminders,
    documentCursor: documentResult.page.nextCursor,
    reminderCursor: reminderResult.page.nextCursor,
  };
  return respond(observation, payload, 200, "ok");
}
