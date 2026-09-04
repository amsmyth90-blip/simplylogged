import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { KitchenMutation } from "@diarydock/kitchen";

import { mutateKitchenPayload, projectKitchenSnapshot } from "./payload";

type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadKitchenSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return { error: null, snapshot: projectKitchenSnapshot(data?.payload, data?.updated_at ?? null) };
}

export async function applyKitchenMutation(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mutation: KitchenMutation,
) {
  const current = await loadRow(supabase, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectKitchenSnapshot(current.data?.payload, current.data?.updated_at ?? null);
  if (mutation.revision !== snapshot.revision) return { status: "CONFLICT" as const, snapshot };
  const result = mutateKitchenPayload(current.data?.payload, mutation);
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await admin.rpc("apply_mobile_kitchen_items_state", {
    input_user_id: userId,
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return { status: "OK" as const, snapshot: projectKitchenSnapshot(write.data.payload, write.data.updated_at) };
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadKitchenSnapshot(supabase, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
