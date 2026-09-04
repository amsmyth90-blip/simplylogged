import "server-only";

import type { TravelMutation } from "@diarydock/travel";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateTravelPayload } from "./mobile-mutation.ts";
import { projectTravelSnapshot } from "./mobile-payload.ts";

type StateRow = { payload: unknown; updated_at: string };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<StateRow>();
}

export async function loadTravelSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try {
    return { error: null, snapshot: projectTravelSnapshot(
      data?.payload, data?.updated_at ?? null,
    ) };
  } catch {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
}

export async function applyTravelMutation(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mutation: TravelMutation,
) {
  const current = await loadRow(supabase, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  let snapshot;
  try {
    snapshot = projectTravelSnapshot(current.data?.payload, current.data?.updated_at ?? null);
  } catch {
    return { status: "ERROR" as const, snapshot: null };
  }
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  if (mutation.operation === "LINK_DOCUMENT") {
    const document = await supabase.from("documents").select("id")
      .eq("id", mutation.documentId).eq("user_id", userId).maybeSingle<{ id: string }>();
    if (document.error) return { status: "ERROR" as const, snapshot: null };
    if (!document.data) return { status: "INVALID_REFERENCE" as const, snapshot };
  }
  const result = mutateTravelPayload(current.data?.payload, mutation);
  if (result.status !== "OK" || !result.payload) {
    return { status: result.status, snapshot };
  }
  const write = await admin.rpc("apply_mobile_travel_state", {
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<StateRow>();
  if (!write.error && write.data) {
    try {
      return { status: "OK" as const,
        snapshot: projectTravelSnapshot(write.data.payload, write.data.updated_at) };
    } catch {
      return { status: "ERROR" as const, snapshot: null };
    }
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadTravelSnapshot(supabase, userId);
  return latest.snapshot ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
