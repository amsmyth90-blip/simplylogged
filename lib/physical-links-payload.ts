import {
  PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
  PHYSICAL_LINKS_SCHEMA_VERSION,
  parsePhysicalAssetDetail,
  parsePhysicalLinksSnapshot,
} from "@diarydock/physical-links";

import { jsonUtf8Bytes } from "./serialization/json-size.ts";

export const PHYSICAL_LINKS_SNAPSHOT_BYTES = 480 * 1024;

export type PhysicalAssetSource = {
  id: string; name: string; category: string; location: string; manufacturer: string;
  model: string; serial_number_masked: string; warranty_due_at: string | null;
  next_service_at: string | null; maintenance_notes: string; created_at: string; updated_at: string;
};

export type PhysicalLinkSource = {
  id: string; name: string; resource_id: string; status: string; expires_at: string | null;
  last_used_at: string | null; use_count: number; created_at: string; updated_at: string;
};

function clean(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

export function physicalAsset(row: PhysicalAssetSource) {
  return { id: row.id, name: clean(row.name, 120), category: row.category,
    location: clean(row.location, 120), manufacturer: clean(row.manufacturer, 120),
    model: clean(row.model, 120), serialNumberMasked: clean(row.serial_number_masked, 16),
    warrantyDueAt: row.warranty_due_at, nextServiceAt: row.next_service_at,
    maintenanceNotes: clean(row.maintenance_notes, 1_000), createdAt: row.created_at,
    updatedAt: row.updated_at };
}

function link(row: PhysicalLinkSource) {
  return { id: row.id, name: clean(row.name, 120), resourceId: row.resource_id,
    status: row.status, expiresAt: row.expires_at, lastUsedAt: row.last_used_at,
    useCount: row.use_count, createdAt: row.created_at, updatedAt: row.updated_at };
}

function isComplete(assetRows: PhysicalAssetSource[], linkRows: PhysicalLinkSource[]) {
  return assetRows.every((row) => row.name.trim().length <= 120
    && row.location.trim().length <= 120 && row.manufacturer.trim().length <= 120
    && row.model.trim().length <= 120 && row.serial_number_masked.trim().length <= 16
    && row.maintenance_notes.trim().length <= 1_000)
    && linkRows.every((row) => row.name.trim().length <= 120);
}

export function buildPhysicalLinksSnapshot(revision: string, assetRows: PhysicalAssetSource[],
  linkRows: PhysicalLinkSource[]) {
  let assets = assetRows.map(physicalAsset); const links = linkRows.map(link);
  let detailsComplete = isComplete(assetRows, linkRows);
  let candidate = { schemaVersion: PHYSICAL_LINKS_SCHEMA_VERSION, revision,
    detailsComplete, assets, links };
  if (jsonUtf8Bytes(candidate) > PHYSICAL_LINKS_SNAPSHOT_BYTES) {
    detailsComplete = false;
    assets = assets.map((item) => ({ ...item, maintenanceNotes: "" }));
    candidate = { ...candidate, detailsComplete, assets };
  }
  if (jsonUtf8Bytes(candidate) > PHYSICAL_LINKS_SNAPSHOT_BYTES) {
    assets = assets.map((item) => ({ ...item, location: "", manufacturer: "", model: "" }));
    candidate = { ...candidate, assets };
  }
  if (jsonUtf8Bytes(candidate) > PHYSICAL_LINKS_SNAPSHOT_BYTES) {
    throw new Error("Physical Links response is too large.");
  }
  return parsePhysicalLinksSnapshot(candidate);
}

export function buildPhysicalAssetDetail(row: PhysicalAssetSource) {
  return parsePhysicalAssetDetail({ schemaVersion: PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
    asset: physicalAsset(row) });
}
