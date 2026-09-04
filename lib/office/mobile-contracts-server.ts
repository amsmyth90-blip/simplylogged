import "server-only";

import type { OfficeContractMutation } from "@diarydock/office";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateOfficeContractsPayload, projectOfficeContractDetail,
  projectOfficeContractsSnapshot } from "./mobile-contracts-payload";

type AppStateRow = { payload: unknown; updated_at: string };

function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadOfficeContractsSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return { error: null, snapshot: projectOfficeContractsSnapshot(data?.payload, data?.updated_at ?? null) };
}

export async function loadOfficeContractDetail(supabase: SupabaseClient, userId: string,
  contractId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, detail: null };
  const detail = projectOfficeContractDetail(data?.payload, contractId);
  return detail ? { error: null, detail }
    : { error: "NOT_FOUND" as const, detail: null };
}

export async function applyOfficeContractMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: OfficeContractMutation,
) {
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectOfficeContractsSnapshot(current.data?.payload, current.data?.updated_at ?? null);
  if (mutation.revision !== snapshot.revision) return { status: "CONFLICT" as const, snapshot };
  const result = mutateOfficeContractsPayload(current.data?.payload, mutation);
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await writeClient.rpc("apply_mobile_office_state", {
    input_document: result.document,
    input_document_kind: "contract",
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return { status: "OK" as const,
      snapshot: projectOfficeContractsSnapshot(write.data.payload, write.data.updated_at) };
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadOfficeContractsSnapshot(readClient, userId);
  return latest.snapshot ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
