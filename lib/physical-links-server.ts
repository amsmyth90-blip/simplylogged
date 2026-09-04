import "server-only";

import {
  type NewPhysicalLink,
  type PhysicalLinksMutation,
} from "@diarydock/physical-links";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildPhysicalLinksSnapshot,
  buildPhysicalAssetDetail,
  type PhysicalAssetSource,
  type PhysicalLinkSource,
} from "./physical-links-payload.ts";
import { createPhysicalLinkToken, physicalLinkPath } from "./physical-links.ts";

type RevisionRow = { revision: number | string };
type MutationRow = { status: string; entity_id: string | null; revision: number | string };

export async function loadPhysicalAssetDetail(supabase: SupabaseClient, userId: string,
  assetId: string) {
  const result = await supabase.from("assets")
    .select("id,name,category,location,manufacturer,model,serial_number_masked,warranty_due_at,next_service_at,maintenance_notes,created_at,updated_at")
    .eq("owner_id", userId).eq("id", assetId).maybeSingle();
  if (result.error) return { error: "UNAVAILABLE" as const, detail: null };
  if (!result.data) return { error: "NOT_FOUND" as const, detail: null };
  try { return { error: null,
    detail: buildPhysicalAssetDetail(result.data as PhysicalAssetSource) }; }
  catch { return { error: "UNAVAILABLE" as const, detail: null }; }
}

export async function loadPhysicalLinksSnapshot(supabase: SupabaseClient, userId: string) {
  const [assets, links, revision] = await Promise.all([
    supabase.from("assets").select("id,name,category,location,manufacturer,model,serial_number_masked,warranty_due_at,next_service_at,maintenance_notes,created_at,updated_at")
      .eq("owner_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("physical_links").select("id,name,resource_id,status,expires_at,last_used_at,use_count,created_at,updated_at")
      .eq("owner_id", userId).order("created_at", { ascending: false }).limit(400),
    supabase.from("physical_link_revisions").select("revision")
      .eq("owner_id", userId).maybeSingle<RevisionRow>(),
  ]);
  if (assets.error || links.error || revision.error) {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
  try {
    return { error: null, snapshot: buildPhysicalLinksSnapshot(String(revision.data?.revision ?? 0),
      (assets.data ?? []) as PhysicalAssetSource[], (links.data ?? []) as PhysicalLinkSource[]) };
  } catch { return { error: "UNAVAILABLE" as const, snapshot: null }; }
}

export async function applyPhysicalLinksMutation(supabase: SupabaseClient, admin: SupabaseClient,
  userId: string, mutation: PhysicalLinksMutation) {
  const token = mutation.operation === "CREATE_LINK" || mutation.operation === "REPLACE_LINK"
    ? createPhysicalLinkToken() : null;
  const result = await admin.rpc("apply_physical_links_mutation", {
    input_user_id: userId,
    input_expected_revision: mutation.revision,
    input_mutation: mutation,
    input_public_id: token?.publicId ?? null,
    input_secret_hash: token?.secretHash ?? null,
  }).maybeSingle<MutationRow>();
  if (result.error || !result.data) {
    return { status: "ERROR" as const, snapshot: null, newLink: null };
  }
  const latest = await loadPhysicalLinksSnapshot(supabase, userId);
  if (!latest.snapshot) return { status: "ERROR" as const, snapshot: null, newLink: null };
  const status = result.data.status as "OK" | "CONFLICT" | "CAPACITY"
    | "NOT_FOUND" | "INVALID_REFERENCE";
  const newLink: NewPhysicalLink | null = status === "OK" && token && result.data.entity_id
    ? { id: result.data.entity_id, path: physicalLinkPath(token.publicId, token.secret) } : null;
  return { status, snapshot: latest.snapshot, newLink };
}
