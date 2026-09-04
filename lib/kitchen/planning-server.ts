import "server-only";

import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  type KitchenPlanningMutation,
} from "@diarydock/kitchen";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateKitchenPlanningPayload, projectKitchenPlanningSnapshot } from "./planning-payload.ts";
import { normaliseRecipes } from "./planning-normalize.ts";

type StateRow = { payload: unknown; updated_at: string };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<StateRow>();
}

export async function loadKitchenPlanningSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try {
    return { error: null, snapshot: projectKitchenPlanningSnapshot(
      data?.payload, data?.updated_at ?? null,
    ) };
  } catch {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
}

export async function loadKitchenRecipeDetail(
  supabase: SupabaseClient,
  userId: string,
  recipeId: string,
) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, detail: null };
  const recipe = normaliseRecipes(
    (data?.payload as { kitchenRecipes?: unknown } | null)?.kitchenRecipes,
  ).find((candidate) => candidate.id === recipeId);
  return {
    error: null,
    detail: recipe
      ? {
          schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
          revision: data?.updated_at ?? null,
          recipe,
        }
      : null,
  };
}

export async function applyKitchenPlanningMutation(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mutation: KitchenPlanningMutation,
) {
  const current = await loadRow(supabase, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null, addedCount: 0 };
  let snapshot;
  try {
    snapshot = projectKitchenPlanningSnapshot(current.data?.payload, current.data?.updated_at ?? null);
  } catch {
    return { status: "ERROR" as const, snapshot: null, addedCount: 0 };
  }
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot, addedCount: 0 };
  }
  const result = mutateKitchenPlanningPayload(current.data?.payload, mutation);
  if (result.status !== "OK" || !result.payload) {
    return { status: result.status, snapshot, addedCount: 0 };
  }
  const write = await admin.rpc("apply_mobile_kitchen_planning_state", {
    input_user_id: userId,
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
  }).maybeSingle<StateRow>();
  if (!write.error && write.data) {
    try {
      return { status: "OK" as const, snapshot: projectKitchenPlanningSnapshot(
        write.data.payload, write.data.updated_at,
      ), addedCount: result.addedCount };
    } catch {
      return { status: "ERROR" as const, snapshot: null, addedCount: 0 };
    }
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null, addedCount: 0 };
  const latest = await loadKitchenPlanningSnapshot(supabase, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot, addedCount: 0 }
    : { status: "ERROR" as const, snapshot: null, addedCount: 0 };
}
