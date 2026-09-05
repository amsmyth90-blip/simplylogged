import "server-only";

import type { OnboardingMutation } from "@diarydock/onboarding";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureServiceHousehold } from "@/lib/household/ensure-service-household";

import { projectOnboardingSnapshot } from "./mobile-onboarding-payload.ts";

type AppStateRow = { payload: unknown; updated_at: string };
type MutationRow = { status: "OK" | "CONFLICT"; revision: string | null };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadOnboardingSnapshot(supabase: SupabaseClient, userId: string,
  fallbackProfileName = "") {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try { return { error: null, snapshot: projectOnboardingSnapshot(data?.payload,
    data?.updated_at ?? null, fallbackProfileName) }; }
  catch { return { error: "UNAVAILABLE" as const, snapshot: null }; }
}

export async function applyOnboardingMutation(supabase: SupabaseClient, admin: SupabaseClient,
  userId: string, mutation: OnboardingMutation, fallbackProfileName = "") {
  const current = await loadOnboardingSnapshot(supabase, userId, fallbackProfileName);
  if (!current.snapshot) return { status: "ERROR" as const, snapshot: null };
  if (current.snapshot.revision !== mutation.revision) {
    return { status: "CONFLICT" as const, snapshot: current.snapshot };
  }
  const setup = { profileName: mutation.profileName, householdName: mutation.householdName,
    householdMembers: mutation.householdMembers, selectedAreaIds: mutation.selectedAreaIds,
    answers: mutation.answers };
  const householdReady = await ensureServiceHousehold(admin, userId,
    mutation.householdName, mutation.profileName);
  if (!householdReady) return { status: "ERROR" as const, snapshot: null };
  const result = await admin.rpc("apply_mobile_onboarding", { input_user_id: userId,
    input_expected_revision: mutation.revision, input_setup: setup }).maybeSingle<MutationRow>();
  if (result.error || !result.data) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadOnboardingSnapshot(supabase, userId, fallbackProfileName);
  if (!latest.snapshot) return { status: "ERROR" as const, snapshot: null };
  return { status: result.data.status, snapshot: latest.snapshot };
}
