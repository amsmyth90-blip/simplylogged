import {
  HOME_HANDOVER_SCHEMA_VERSION,
  parseHomeHandoverSnapshot,
} from "@diarydock/home-handover";

import { jsonUtf8Bytes, utf8Text } from "./serialization/json-size.ts";

export const HOME_HANDOVER_SNAPSHOT_BYTES = 480 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const HOME_HANDOVER_EXCLUSIONS = ["Private and unselected files",
  "Financial records and receipts", "Identity, legal and correspondence records",
  "Health, travel, pet and insurance records", "Emergency information",
  "Vault or future encrypted Vault content"];

export type HandoverPackSource = { id: string; name: string; updated_at: string };
export type HandoverAssetSource = { id: string; name: string; category: string;
  location: string | null; manufacturer: string | null; model: string | null;
  document_ids: unknown; handover_eligible: boolean };
export type HandoverDocumentSource = { id: string; title: string; category: string;
  kind: string | null; issuer: string | null; handover_eligible: boolean };
export type HandoverItemSource = { id: string; resource_type: string; resource_id: string;
  preview_snapshot: unknown; added_at: string };
export type HandoverPublicationSource = { id: string; pack_id: string; recipient_email: string;
  published_at: string; expires_at: string; updated_at: string; published_snapshot: unknown };

function clean(value: unknown, characters: number, bytes: number) {
  return utf8Text(value, characters, bytes);
}
function preview(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
export function handoverDetail(values: unknown[]) {
  return clean(values.map((value) => clean(value, 120, 240)).filter(Boolean).join(" · "), 400, 800);
}
export function handoverLabel(value: unknown) {
  return clean(value, 160, 320);
}
export function handoverPublishedItems(value: unknown) {
  const source = preview(value);
  if (!Array.isArray(source.items)) return [];
  return source.items.slice(0, 200).flatMap((entry) => {
    const item = preview(entry);
    const id = String(item.id ?? "");
    const resourceType = item.resourceType;
    const label = handoverLabel(item.label);
    if (!uuidPattern.test(id) || (resourceType !== "ASSET" && resourceType !== "DOCUMENT") || !label) {
      return [];
    }
    return [{ id, resourceType, label, detail: clean(item.detail, 400, 800) }];
  });
}

export function handoverDocumentIds(assets: HandoverAssetSource[]) {
  const result = new Set<string>();
  for (const asset of assets) {
    if (!Array.isArray(asset.document_ids)) continue;
    for (const value of asset.document_ids) {
      const id = String(value);
      if (uuidPattern.test(id)) result.add(id);
      if (result.size >= 400) return [...result];
    }
  }
  return [...result];
}

export function buildHomeHandoverSnapshot(pack: HandoverPackSource | null,
  assetRows: HandoverAssetSource[], documentRows: HandoverDocumentSource[],
  itemRows: HandoverItemSource[], publicationRow: HandoverPublicationSource | null = null,
  receivedRows: HandoverPublicationSource[] = []) {
  const selected = new Set(itemRows.map((item) => `${item.resource_type}:${item.resource_id}`));
  let candidates = [
    ...assetRows.filter((row) => uuidPattern.test(row.id)).map((row) => ({
      resourceType: "ASSET" as const, resourceId: row.id, label: handoverLabel(row.name),
      detail: handoverDetail([row.category, row.location, row.manufacturer, row.model]),
      selected: selected.has(`ASSET:${row.id}`),
    })),
    ...documentRows.filter((row) => uuidPattern.test(row.id)).map((row) => ({
      resourceType: "DOCUMENT" as const, resourceId: row.id, label: handoverLabel(row.title),
      detail: handoverDetail([row.category, "Linked to an eligible home item"]),
      selected: selected.has(`DOCUMENT:${row.id}`),
    })),
  ].filter((item) => item.label);
  let items = itemRows.filter((row) => uuidPattern.test(row.id) && uuidPattern.test(row.resource_id)
    && (row.resource_type === "ASSET" || row.resource_type === "DOCUMENT")).map((row) => {
    const value = preview(row.preview_snapshot);
    return { id: row.id, resourceType: row.resource_type as "ASSET" | "DOCUMENT",
      resourceId: row.resource_id, label: clean(value.name ?? value.title ?? "Selected item", 160, 320),
      detail: handoverDetail([value.type, value.category, value.location, value.manufacturer, value.model]),
      selected: true, addedAt: row.added_at };
  });
  let detailsComplete = true;
  const publicationItems = publicationRow ? handoverPublishedItems(publicationRow.published_snapshot) : [];
  const publication = publicationRow && publicationItems.length ? {
    id: publicationRow.id, recipientEmail: clean(publicationRow.recipient_email, 254, 254),
    publishedAt: publicationRow.published_at, expiresAt: publicationRow.expires_at,
    revision: publicationRow.updated_at, itemCount: publicationItems.length,
  } : null;
  let received = receivedRows.flatMap((row) => {
    const value = preview(row.published_snapshot);
    const shared = handoverPublishedItems(value);
    const name = clean(value.name, 120, 240);
    return uuidPattern.test(row.id) && name && shared.length ? [{ id: row.id, name,
      publishedAt: row.published_at, expiresAt: row.expires_at, items: shared }] : [];
  });
  let snapshot = { schemaVersion: HOME_HANDOVER_SCHEMA_VERSION, detailsComplete,
    draft: pack ? { id: pack.id, name: clean(pack.name, 120, 240), revision: pack.updated_at } : null,
    candidates, items, publication, received, exclusions: HOME_HANDOVER_EXCLUSIONS };
  if (jsonUtf8Bytes(snapshot) > HOME_HANDOVER_SNAPSHOT_BYTES) {
    detailsComplete = false;
    candidates = candidates.map((item) => ({ ...item, detail: "" }));
    items = items.map((item) => ({ ...item, detail: "" }));
    received = received.map((entry) => ({ ...entry,
      items: entry.items.map((item) => ({ ...item, detail: "" })) }));
    snapshot = { ...snapshot, detailsComplete, candidates, items, received };
  }
  if (jsonUtf8Bytes(snapshot) > HOME_HANDOVER_SNAPSHOT_BYTES) {
    candidates = candidates.map((item) => ({ ...item, label: clean(item.label, 80, 160) }));
    items = items.map((item) => ({ ...item, label: clean(item.label, 80, 160) }));
    snapshot = { ...snapshot, candidates, items };
  }
  if (jsonUtf8Bytes(snapshot) > HOME_HANDOVER_SNAPSHOT_BYTES) {
    while (received.length && jsonUtf8Bytes(snapshot) > HOME_HANDOVER_SNAPSHOT_BYTES) {
      received = received.slice(0, -1); snapshot = { ...snapshot, received };
    }
  }
  if (jsonUtf8Bytes(snapshot) > HOME_HANDOVER_SNAPSHOT_BYTES) {
    throw new Error("Home Handover response is too large.");
  }
  return parseHomeHandoverSnapshot(snapshot);
}
