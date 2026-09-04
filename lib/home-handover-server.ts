import "server-only";

import { HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
  type HomeHandoverDetailRequest, type HomeHandoverMutation } from "@diarydock/home-handover";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isHandoverAssetCategory, isHandoverDocumentCategory } from "./home-handover.ts";
import { buildHomeHandoverSnapshot, handoverDetail, handoverDocumentIds, handoverLabel,
  handoverPublishedItems,
  type HandoverAssetSource, type HandoverDocumentSource, type HandoverItemSource,
  type HandoverPackSource, type HandoverPublicationSource } from "./home-handover-payload.ts";

type MutationRow = { status: string; pack_id: string | null; revision: string | null;
  publication_id?: string | null };

function ownerDetail(request: Extract<HomeHandoverDetailRequest, { scope: "OWNER" }>,
  row: HandoverAssetSource | HandoverDocumentSource) {
  const detail = request.resourceType === "ASSET"
    ? handoverDetail([(row as HandoverAssetSource).category,
      (row as HandoverAssetSource).location, (row as HandoverAssetSource).manufacturer,
      (row as HandoverAssetSource).model])
    : handoverDetail([(row as HandoverDocumentSource).category,
      "Linked to an eligible home item"]);
  return { ...request, schemaVersion: HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
    label: handoverLabel(request.resourceType === "ASSET" ? (row as HandoverAssetSource).name
      : (row as HandoverDocumentSource).title), detail };
}

export async function loadHomeHandoverDetail(admin: SupabaseClient, userId: string,
  recipientEmail: string | null, request: HomeHandoverDetailRequest) {
  if (request.scope === "OWNER" && request.resourceType === "ASSET") {
    const result = await admin.from("assets")
      .select("id,name,category,location,manufacturer,model,document_ids,handover_eligible")
      .eq("owner_id", userId).eq("id", request.resourceId).maybeSingle();
    if (result.error) return { error: "UNAVAILABLE" as const, detail: null };
    const row = result.data as HandoverAssetSource | null;
    if (!row || !isHandoverAssetCategory(String(row.category))) {
      return { error: "NOT_FOUND" as const, detail: null };
    }
    return { error: null, detail: ownerDetail(request, row) };
  }
  if (request.scope === "OWNER") {
    const [document, links] = await Promise.all([
      admin.from("documents").select("id,title,category,kind,issuer,handover_eligible")
        .eq("user_id", userId).eq("id", request.resourceId).maybeSingle(),
      admin.from("assets").select("category").eq("owner_id", userId)
        .contains("document_ids", [request.resourceId]).limit(20),
    ]);
    if (document.error || links.error) return { error: "UNAVAILABLE" as const, detail: null };
    const row = document.data as HandoverDocumentSource | null;
    const eligibleLink = (links.data ?? []).some((item) =>
      isHandoverAssetCategory(String(item.category)));
    if (!row || !eligibleLink || !isHandoverDocumentCategory(String(row.category))) {
      return { error: "NOT_FOUND" as const, detail: null };
    }
    return { error: null, detail: ownerDetail(request, row) };
  }
  const publication = await admin.from("home_handover_publications")
    .select("owner_id,recipient_email,expires_at,revoked_at,published_snapshot")
    .eq("id", request.publicationId).maybeSingle();
  if (publication.error) return { error: "UNAVAILABLE" as const, detail: null };
  const row = publication.data;
  const authorised = row && (row.owner_id === userId
    || (recipientEmail && row.recipient_email === recipientEmail));
  if (!authorised || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) {
    return { error: "NOT_FOUND" as const, detail: null };
  }
  const item = handoverPublishedItems(row.published_snapshot)
    .find((candidate) => candidate.id === request.itemId);
  if (!item) return { error: "NOT_FOUND" as const, detail: null };
  return { error: null, detail: { ...request,
    schemaVersion: HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
    label: item.label, detail: item.detail } };
}

export async function loadHomeHandoverSnapshot(admin: SupabaseClient, userId: string,
  recipientEmail: string | null = null) {
  const now = new Date().toISOString();
  const [packs, assets, publications, received] = await Promise.all([
    admin.from("home_handover_packs").select("id,name,updated_at").eq("owner_id", userId)
      .eq("status", "DRAFT").order("updated_at", { ascending: false }).limit(1),
    admin.from("assets").select("id,name,category,location,manufacturer,model,document_ids,handover_eligible")
      .eq("owner_id", userId).order("created_at", { ascending: false }).limit(200),
    admin.from("home_handover_publications")
      .select("id,pack_id,recipient_email,published_at,expires_at,updated_at,published_snapshot")
      .eq("owner_id", userId).is("revoked_at", null).gt("expires_at", now)
      .order("updated_at", { ascending: false }).limit(20),
    recipientEmail ? admin.from("home_handover_publications")
      .select("id,pack_id,recipient_email,published_at,expires_at,updated_at,published_snapshot")
      .eq("recipient_email", recipientEmail).is("revoked_at", null).gt("expires_at", now)
      .order("published_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
  ]);
  if (packs.error || assets.error || publications.error || received.error) {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
  const eligibleAssets = ((assets.data ?? []) as HandoverAssetSource[])
    .filter((asset) => isHandoverAssetCategory(String(asset.category)));
  const documentIds = handoverDocumentIds(eligibleAssets);
  const documents = documentIds.length ? await admin.from("documents")
    .select("id,title,category,kind,issuer,handover_eligible").eq("user_id", userId)
    .in("id", documentIds).limit(400) : { data: [], error: null };
  const pack = ((packs.data ?? [])[0] ?? null) as HandoverPackSource | null;
  const publication = ((publications.data ?? []) as HandoverPublicationSource[])
    .find((entry) => entry.pack_id === pack?.id) ?? null;
  const itemResult = pack ? await admin.from("home_handover_items")
    .select("id,resource_type,resource_id,preview_snapshot,added_at")
    .eq("owner_id", userId).eq("pack_id", pack.id).order("added_at").limit(200)
    : { data: [], error: null };
  if (documents.error || itemResult.error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try { return { error: null, snapshot: buildHomeHandoverSnapshot(pack, eligibleAssets,
    ((documents.data ?? []) as HandoverDocumentSource[]).filter((item) =>
      isHandoverDocumentCategory(String(item.category))),
    (itemResult.data ?? []) as HandoverItemSource[], publication,
    (received.data ?? []) as HandoverPublicationSource[]) }; }
  catch { return { error: "UNAVAILABLE" as const, snapshot: null }; }
}

export async function applyHomeHandoverMutation(admin: SupabaseClient, userId: string,
  recipientEmail: string | null, mutation: HomeHandoverMutation) {
  const publicationChange = mutation.operation === "PUBLISH" || mutation.operation === "REVOKE";
  const expectedRevision = mutation.operation === "SET_ITEM" || mutation.operation === "PUBLISH"
    ? mutation.revision : mutation.operation === "REVOKE" ? mutation.publicationRevision : null;
  const result = await admin.rpc(publicationChange ? "apply_home_handover_publication"
    : "apply_home_handover_mutation", { input_user_id: userId,
    input_expected_revision: expectedRevision,
    input_mutation: mutation }).maybeSingle<MutationRow>();
  if (result.error || !result.data) return { status: "ERROR" as const, snapshot: null };
  const latest = await loadHomeHandoverSnapshot(admin, userId, recipientEmail);
  if (!latest.snapshot) return { status: "ERROR" as const, snapshot: null };
  return { status: result.data.status as "OK" | "EXISTS" | "CONFLICT" | "CAPACITY"
    | "NOT_FOUND" | "INVALID_REFERENCE" | "INVALID_RECIPIENT" | "EMPTY" | "TOO_LARGE"
    | "RECENT_AUTH_REQUIRED", snapshot: latest.snapshot };
}
