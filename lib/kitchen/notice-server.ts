import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { KitchenNoticeMutation } from "@diarydock/kitchen";

import { mutateKitchenNoticeboard, projectKitchenNoticeboard } from "./notice-payload";

type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadKitchenNoticeboard(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectKitchenNoticeboard(data?.payload, data?.updated_at ?? null),
  };
}

export async function applyKitchenNoticeMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: KitchenNoticeMutation,
) {
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectKitchenNoticeboard(current.data?.payload, current.data?.updated_at ?? null);
  if (mutation.revision !== snapshot.revision) return { status: "CONFLICT" as const, snapshot };
  const result = mutateKitchenNoticeboard(current.data?.payload, mutation);
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await writeClient.rpc("apply_mobile_kitchen_notice_state", {
    input_delete_reminder_id: result.effect.deleteReminderId,
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_reminder: result.effect.upsertReminder,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return {
      status: "OK" as const,
      snapshot: projectKitchenNoticeboard(write.data.payload, write.data.updated_at),
    };
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadKitchenNoticeboard(readClient, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
