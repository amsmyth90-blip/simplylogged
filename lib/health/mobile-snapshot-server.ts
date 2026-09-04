import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthMutation } from "@diarydock/health";

import { mutateHealthPayload, projectHealthSnapshot } from "./mobile-payload.ts";

type AppStateRow = { payload: unknown; updated_at: string };

export async function loadHealthSnapshot(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectHealthSnapshot(data?.payload, data?.updated_at ?? null),
  };
}

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("app_state")
    .select("payload,updated_at")
    .eq("id", userId)
    .maybeSingle<AppStateRow>();
}

export async function applyHealthMutation(
  supabase: SupabaseClient,
  userId: string,
  mutation: HealthMutation,
) {
  const current = await loadRow(supabase, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectHealthSnapshot(
    current.data?.payload,
    current.data?.updated_at ?? null,
  );
  const result = mutateHealthPayload(current.data?.payload, mutation);
  if (result.status === "IDEMPOTENT") {
    return { status: "OK" as const, snapshot };
  }
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = current.data
    ? await supabase
        .from("app_state")
        .update({ payload: result.payload })
        .eq("id", userId)
        .eq("updated_at", current.data.updated_at)
        .select("payload,updated_at")
        .maybeSingle<AppStateRow>()
    : await supabase
        .from("app_state")
        .insert({ id: userId, payload: result.payload })
        .select("payload,updated_at")
        .maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return {
      status: "OK" as const,
      snapshot: projectHealthSnapshot(write.data.payload, write.data.updated_at),
    };
  }
  if (write.error && write.error.code !== "23505") return { status: "ERROR" as const, snapshot: null };
  const latest = await loadHealthSnapshot(supabase, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
