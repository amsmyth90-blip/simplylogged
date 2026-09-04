import "server-only";

import type { OfficeContactsMutation } from "@diarydock/office";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mutateOfficeContactsPayload,
  projectOfficeContactDetail,
  projectOfficeContactsSnapshot,
} from "./mobile-contacts-payload";

type AppStateRow = { payload: unknown; updated_at: string };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadOfficeContactsSnapshot(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectOfficeContactsSnapshot(data?.payload, data?.updated_at ?? null),
  };
}

export async function loadOfficeContactDetail(supabase: SupabaseClient,
  userId: string, contactId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, detail: null };
  const detail = projectOfficeContactDetail(data?.payload, contactId);
  return detail ? { error: null, detail }
    : { error: "NOT_FOUND" as const, detail: null };
}

export async function applyOfficeContactsMutation(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mutation: OfficeContactsMutation,
) {
  const current = await loadRow(supabase, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectOfficeContactsSnapshot(
    current.data?.payload,
    current.data?.updated_at ?? null,
  );
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  const result = mutateOfficeContactsPayload(current.data?.payload, mutation);
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await admin.rpc("apply_mobile_contact_state", {
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return {
      status: "OK" as const,
      snapshot: projectOfficeContactsSnapshot(write.data.payload, write.data.updated_at),
    };
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadOfficeContactsSnapshot(supabase, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
