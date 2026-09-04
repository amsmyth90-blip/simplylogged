import "server-only";

import type { GarageMutation } from "@diarydock/vehicles";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateGaragePayload, projectGarageSnapshot } from "./mobile-payload";

type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("app_state")
    .select("payload,updated_at")
    .eq("id", userId)
    .maybeSingle<AppStateRow>();
}

export async function loadGarageSnapshot(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectGarageSnapshot(data?.payload, data?.updated_at ?? null),
  };
}

export async function applyGarageMutation(
  supabase: SupabaseClient,
  userId: string,
  mutation: GarageMutation,
) {
  const current = await loadRow(supabase, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectGarageSnapshot(
    current.data?.payload,
    current.data?.updated_at ?? null,
  );
  if (mutation.operation === "ADD_VEHICLE"
    && snapshot.vehicles.some((vehicle) => vehicle.id === mutation.vehicleId)) {
    return { status: "OK" as const, snapshot };
  }
  if (mutation.revision !== snapshot.revision)
    return { status: "CONFLICT" as const, snapshot };
  const result = mutateGaragePayload(current.data?.payload, mutation);
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
      snapshot: projectGarageSnapshot(
        write.data.payload,
        write.data.updated_at,
      ),
    };
  }
  if (write.error && write.error.code !== "23505") {
    return { status: "ERROR" as const, snapshot: null };
  }
  const latest = await loadGarageSnapshot(supabase, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
