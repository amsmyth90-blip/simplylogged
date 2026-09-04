import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmergencyMutation } from "@diarydock/emergency";

import { mutateEmergencyPayload, projectEmergencySnapshot } from "./payload";

type AppStatePayload = Record<string, unknown>;
type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadEmergencySnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectEmergencySnapshot(data?.payload, data?.updated_at ?? null),
  };
}

export async function applyEmergencyMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: EmergencyMutation,
) {
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectEmergencySnapshot(current.data?.payload, current.data?.updated_at ?? null);
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  let payload: AppStatePayload;
  try {
    payload = mutateEmergencyPayload(current.data?.payload, mutation);
  } catch {
    return { status: "CAPACITY" as const, snapshot };
  }
  const write = await writeClient.rpc("apply_mobile_private_state", {
    input_expected_revision: current.data?.updated_at ?? null,
    input_payload: payload,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return {
      status: "OK" as const,
      snapshot: projectEmergencySnapshot(write.data.payload, write.data.updated_at),
    };
  }
  if (write.error && write.error.code !== "23505") {
    return { status: "ERROR" as const, snapshot: null };
  }
  const latest = await loadEmergencySnapshot(readClient, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
