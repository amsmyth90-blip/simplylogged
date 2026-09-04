import { NextResponse } from "next/server";

import type { DiaryDockRecordKind } from "@/lib/diarydock-record-page";
import { loadDiaryDockRecordPage } from "@/lib/diarydock-record-page-server";
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

function query(request: Request) {
  const entries = [...new URL(request.url).searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length
    || entries.some(([key]) => key !== "kind" && key !== "cursor")) return null;
  const values = Object.fromEntries(entries);
  if (values.kind !== "documents" && values.kind !== "reminders") return null;
  return {
    kind: values.kind as DiaryDockRecordKind,
    cursor: typeof values.cursor === "string" ? values.cursor : null,
  };
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "desktop-record-page-read", request, route: "/api/diarydock/records",
  });
  if (!isSupabaseConfiguredServer()) {
    return respond(observation, { error: "Secure records are unavailable." }, 503, "auth-unavailable");
  }
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return respond(observation, { error: "Please sign in again." }, 401, "unauthenticated");
  }
  const input = query(request);
  if (!input) return respond(observation, { error: "That record page was not valid." }, 400, "invalid-query");
  const rate = await checkServerRateLimit(
    createRateLimitKey("desktop:records:read", authData.user.id),
    { limit: 500, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) return respond(observation, { error: "Records are busy. Try again shortly." }, 429, "rate-limited");
  const result = await loadDiaryDockRecordPage(
    supabase, authData.user.id, input.kind, input.cursor,
  );
  if (result.error === "INVALID_CURSOR") {
    return respond(observation, { error: "That record cursor was not valid." }, 400, "invalid-cursor");
  }
  if (!result.page) {
    return respond(observation, { error: "Records could not be loaded." }, 503, "database-unavailable");
  }
  return respond(observation, result.page, 200, "ok");
}
