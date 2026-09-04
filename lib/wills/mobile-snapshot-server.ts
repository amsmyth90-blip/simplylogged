import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WillsMutation } from "@diarydock/wills";

import { mutateWillsPayload, projectWillsSnapshot } from "./mobile-payload.ts";
import {
  requiredWillsDocumentIds,
  validWillsDocumentRows,
  type WillsDocumentRow,
} from "./document-references.ts";

type AppStateRow = { payload: unknown; updated_at: string };

async function loadRow(supabase: SupabaseClient, userId: string) {
  return supabase.from("app_state").select("payload,updated_at")
    .eq("id", userId).maybeSingle<AppStateRow>();
}

export async function loadWillsSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await loadRow(supabase, userId);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  return { error: null, snapshot: projectWillsSnapshot(data?.payload, data?.updated_at ?? null) };
}

export async function applyWillsMutation(
  readClient: SupabaseClient,
  writeClient: SupabaseClient,
  userId: string,
  mutation: WillsMutation,
) {
  const references = await validateDocumentReferences(readClient, userId, mutation);
  if (references === "ERROR") return { status: "ERROR" as const, snapshot: null };
  if (references === "INVALID") {
    const current = await loadWillsSnapshot(readClient, userId);
    return { status: "INVALID_REFERENCE" as const, snapshot: current.snapshot };
  }
  const current = await loadRow(readClient, userId);
  if (current.error) return { status: "ERROR" as const, snapshot: null };
  const snapshot = projectWillsSnapshot(current.data?.payload, current.data?.updated_at ?? null);
  const result = mutateWillsPayload(current.data?.payload, mutation);
  if (result.status === "IDEMPOTENT") return { status: "OK" as const, snapshot };
  if (mutation.revision !== snapshot.revision) return { status: "CONFLICT" as const, snapshot };
  if (result.status !== "OK") return { status: result.status, snapshot };
  const write = await writeClient.rpc("apply_mobile_private_state", {
    input_expected_revision: current.data?.updated_at ?? null,
    input_payload: result.payload,
    input_user_id: userId,
  }).maybeSingle<AppStateRow>();
  if (!write.error && write.data) return {
    status: "OK" as const,
    snapshot: projectWillsSnapshot(write.data.payload, write.data.updated_at),
  };
  if (write.error && write.error.code !== "23505") return { status: "ERROR" as const, snapshot: null };
  const latest = await loadWillsSnapshot(readClient, userId);
  return latest.snapshot
    ? { status: "CONFLICT" as const, snapshot: latest.snapshot }
    : { status: "ERROR" as const, snapshot: null };
}

async function validateDocumentReferences(
  supabase: SupabaseClient,
  userId: string,
  mutation: WillsMutation,
) {
  const ids = requiredWillsDocumentIds(mutation);
  if (!ids.length) return "OK" as const;
  const result = await supabase.from("documents")
    .select("id,room_id,room_name,category")
    .eq("user_id", userId)
    .in("id", ids)
    .returns<WillsDocumentRow[]>();
  if (result.error) return "ERROR" as const;
  if (!validWillsDocumentRows(mutation, ids, result.data ?? [])) return "INVALID" as const;
  return "OK" as const;
}
