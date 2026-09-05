import { NextResponse } from "next/server";

import {
  MAX_DIARYDOCK_STATE_SAVE_BYTES,
  parseDiaryDockStateSaveRequest,
} from "@/lib/diarydock-state-save";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { ensureServiceHousehold } from "@/lib/household/ensure-service-household";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function respond(
  observation: RequestObservation,
  body: unknown,
  status: number,
  outcome: string,
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { status, headers });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

type StateWriteRow = {
  status: "OK" | "CONFLICT";
  private_revision: string | null;
  household_revision: string | null;
};

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "desktop-state-write",
    request,
    route: "/api/diarydock/state",
  });
  if (!isSameOrigin(request)) {
    return respond(observation, { error: "Request origin was not accepted." }, 403, "invalid-origin");
  }
  if (!isSupabaseConfiguredServer()) {
    return respond(observation, { error: "Secure sync is unavailable." }, 503, "auth-unavailable");
  }
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return respond(observation, { error: "Please sign in again to save DiaryDock." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("desktop:state:write", authData.user.id),
    { limit: 60, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return respond(observation, { error: "Please wait before saving again." }, 429, "rate-limited");
  }
  let input;
  try {
    input = parseDiaryDockStateSaveRequest(
      await readBoundedJson(request, MAX_DIARYDOCK_STATE_SAVE_BYTES),
    );
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(observation, { error: "That DiaryDock update was not valid." }, status, "invalid-body");
  }
  if (!isSupabaseAdminConfigured()) {
    return respond(observation, { error: "Secure sync is unavailable." }, 503, "admin-unavailable");
  }
  const admin = getSupabaseAdminClient();
  const householdReady = await ensureServiceHousehold(
    admin,
    authData.user.id,
    input.privateState.onboarding.householdName,
    input.privateState.settingsProfile.name,
  );
  if (!householdReady) {
    return respond(observation, { error: "DiaryDock could not prepare your household." },
      503, "household-unavailable");
  }
  const write = await admin.rpc("apply_diarydock_state", {
    input_expected_household_revision: input.householdRevision,
    input_expected_private_revision: input.privateRevision,
    input_household_payload: input.householdState,
    input_private_payload: input.privateState,
    input_user_id: authData.user.id,
  }).maybeSingle<StateWriteRow>();
  if (write.error || !write.data) {
    return respond(observation, { error: "DiaryDock could not save these changes." }, 503, "database-unavailable");
  }
  const result = {
    status: write.data.status,
    privateRevision: write.data.private_revision,
    householdRevision: write.data.household_revision,
  };
  return write.data.status === "CONFLICT"
    ? respond(observation, result, 409, "revision-conflict")
    : respond(observation, result, 200, "ok");
}
