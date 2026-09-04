import "server-only";

import type { OfficeBillMutation } from "@diarydock/office";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mutateOfficeBillsPayload, projectOfficeBillDetail,
  projectOfficeBillsSnapshot } from "./mobile-bills-payload";

type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadOfficeBillsSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return {
    error: null,
    snapshot: projectOfficeBillsSnapshot(data?.payload, data?.updated_at ?? null),
  };
}

export async function loadOfficeBillDetail(supabase: SupabaseClient, userId: string,
  billId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, detail: null };
  const detail = projectOfficeBillDetail(data?.payload, billId);
  return detail ? { error: null, detail }
    : { error: "NOT_FOUND" as const, detail: null };
}

export async function applyOfficeBillMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: OfficeBillMutation,
) {
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectOfficeBillsSnapshot(current.data?.payload, current.data?.updated_at ?? null);
  if (mutation.revision !== snapshot.revision) return { status: "CONFLICT" as const, snapshot };
  const result = mutateOfficeBillsPayload(current.data?.payload, mutation);
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await writeClient.rpc("apply_mobile_office_state", {
    input_document: result.document,
    input_document_kind: "bill",
    input_expected_revision: snapshot.revision,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) {
    return {
      status: "OK" as const,
      snapshot: projectOfficeBillsSnapshot(write.data.payload, write.data.updated_at),
    };
  }
  if (write.error) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadOfficeBillsSnapshot(readClient, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}
