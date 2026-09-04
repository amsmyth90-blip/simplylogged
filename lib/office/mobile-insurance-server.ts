import "server-only";

import type { OfficeInsuranceMutation } from "@diarydock/office";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mutateOfficeInsurancePayload,
  projectOfficeInsuranceDetail,
  projectOfficeInsuranceSnapshot,
} from "./mobile-insurance-payload";

type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadOfficeInsuranceSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectOfficeInsuranceSnapshot(data?.payload, data?.updated_at ?? null),
  };
}

export async function loadOfficeInsuranceDetail(supabase: SupabaseClient, userId: string,
  resourceType: "POLICY" | "CLAIM", resourceId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, detail: null };
  const detail = projectOfficeInsuranceDetail(data?.payload, resourceType, resourceId);
  return detail ? { error: null, detail }
    : { error: "NOT_FOUND" as const, detail: null };
}

export async function applyOfficeInsuranceMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: OfficeInsuranceMutation,
) {
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectOfficeInsuranceSnapshot(
    current.data?.payload,
    current.data?.updated_at ?? null,
  );
  if (mutation.revision !== snapshot.revision) {
    return { status: "CONFLICT" as const, snapshot };
  }
  const result = mutateOfficeInsurancePayload(current.data?.payload, mutation);
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await writeClient.rpc("apply_mobile_office_state", {
    input_document: result.document,
    input_document_kind: "insurance",
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return {
      status: "OK" as const,
      snapshot: projectOfficeInsuranceSnapshot(write.data.payload, write.data.updated_at),
    };
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadOfficeInsuranceSnapshot(readClient, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
