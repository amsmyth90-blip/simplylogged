import "server-only";

import type { KitchenCalendarMutation } from "@diarydock/kitchen";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateKitchenCalendarPayload, projectKitchenCalendar } from "./calendar-payload";

type StateRow = { payload: unknown; updated_at: string };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<StateRow>();
}

export async function loadKitchenCalendar(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try {
    return { error: null,
      snapshot: projectKitchenCalendar(data?.payload, data?.updated_at ?? null) };
  } catch {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
}

export async function applyKitchenCalendarMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: KitchenCalendarMutation,
) {
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  let snapshot;
  try {
    snapshot = projectKitchenCalendar(current.data?.payload, current.data?.updated_at ?? null);
  } catch {
    return { status: "ERROR" as const, snapshot: null };
  }
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  const result = mutateKitchenCalendarPayload(current.data?.payload, mutation);
  if (result.status !== "OK" || !result.payload) {
    return { status: result.status, snapshot };
  }
  const write = await writeClient.rpc("apply_mobile_kitchen_calendar_state", {
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<StateRow>();
  if (!write.error && write.data) {
    try {
      return { status: "OK" as const,
        snapshot: projectKitchenCalendar(write.data.payload, write.data.updated_at) };
    } catch {
      return { status: "ERROR" as const, snapshot: null };
    }
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadKitchenCalendar(readClient, userId);
  return latest.snapshot ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
