import "server-only";

import type { LifeCheckMutation } from "@diarydock/life-check";
import type { SupabaseClient } from "@supabase/supabase-js";

import { projectLifeCheckSnapshot, updateLifeCheckAnswers } from "./mobile-life-check-payload.ts";

type AppStateRow = { payload: unknown; updated_at: string };
type MutationRow = { status: string; revision: string | null };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadLifeCheckSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try { return { error: null,
    snapshot: projectLifeCheckSnapshot(data?.payload, data?.updated_at ?? null) }; }
  catch { return { error: "UNAVAILABLE" as const, snapshot: null }; }
}

export async function applyLifeCheckMutation(supabase: SupabaseClient, admin: SupabaseClient,
  userId: string, mutation: LifeCheckMutation) {
  const current = await loadLifeCheckSnapshot(supabase, userId);
  if (!current.snapshot) return { status: "ERROR" as const, snapshot: null };
  if (current.snapshot.revision !== mutation.revision) {
    return { status: "CONFLICT" as const, snapshot: current.snapshot };
  }
  const answers = updateLifeCheckAnswers(current.snapshot.answers, mutation.field, mutation.value);
  const result = await admin.rpc("apply_mobile_life_check", { input_user_id: userId,
    input_expected_revision: mutation.revision, input_life_check: answers }).maybeSingle<MutationRow>();
  if (result.error || !result.data) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadLifeCheckSnapshot(supabase, userId);
  if (!latest.snapshot) return { status: "ERROR" as const, snapshot: null };
  return { status: result.data.status as "OK" | "CONFLICT", snapshot: latest.snapshot };
}
