import "server-only";

import type { HouseholdSchedulesMutation } from "@diarydock/household";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateHouseholdSchedulePayload } from "./schedule-mutation";
import { projectHouseholdSchedulesSnapshot } from "./schedule-payload";

type StateRow = { payload: unknown; updated_at: string };

async function context(supabase: SupabaseClient, userId: string) {
  const household = await supabase.rpc("ensure_user_household");
  if (household.error || !household.data) return { error: "UNAVAILABLE" as const };
  const householdId = String(household.data);
  const membership = await supabase.from("household_memberships").select("role")
    .eq("household_id", householdId).eq("user_id", userId)
    .eq("status", "active").maybeSingle<{ role: string }>();
  if (membership.error || !membership.data) return { error: "UNAVAILABLE" as const };
  if (membership.data.role !== "owner" && membership.data.role !== "member") {
    return { error: "FORBIDDEN" as const };
  }
  return { error: null, householdId };
}

async function loadRow(supabase: SupabaseClient, householdId: string) {
  return supabase.from("household_state").select("payload,updated_at")
    .eq("household_id", householdId).maybeSingle<StateRow>();
}

export async function loadHouseholdSchedules(
  supabase: SupabaseClient,
  userId: string,
) {
  const access = await context(supabase, userId);
  if (access.error) return { error: access.error, snapshot: null };
  const row = await loadRow(supabase, access.householdId);
  if (row.error || !row.data) return { error: "UNAVAILABLE" as const, snapshot: null };
  try {
    return {
      error: null,
      snapshot: projectHouseholdSchedulesSnapshot(row.data.payload, row.data.updated_at),
    };
  } catch {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
}

export async function applyHouseholdScheduleMutation(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mutation: HouseholdSchedulesMutation,
) {
  const access = await context(supabase, userId);
  if (access.error) return { status: access.error, snapshot: null };
  const current = await loadRow(supabase, access.householdId);
  if (current.error || !current.data) return { status: "UNAVAILABLE" as const, snapshot: null };
  let snapshot;
  try {
    snapshot = projectHouseholdSchedulesSnapshot(
      current.data.payload,
      current.data.updated_at,
    );
  } catch {
    return { status: "UNAVAILABLE" as const, snapshot: null };
  }
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  const result = mutateHouseholdSchedulePayload(current.data.payload, mutation);
  if (result.status !== "OK" || !result.payload) {
    return { status: result.status, snapshot };
  }
  const write = await admin.rpc("apply_mobile_household_schedule_state", {
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<StateRow>();
  if (!write.error && write.data) {
    try {
      return {
        status: "OK" as const,
        snapshot: projectHouseholdSchedulesSnapshot(write.data.payload, write.data.updated_at),
      };
    } catch {
      return { status: "UNAVAILABLE" as const, snapshot: null };
    }
  }
  if (write.error) return { status: "UNAVAILABLE" as const, snapshot: null };
  const latest = await loadHouseholdSchedules(supabase, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "UNAVAILABLE" as const, snapshot: null };
}
