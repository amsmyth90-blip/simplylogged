import {
  PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
  PHYSICAL_LINKS_SCHEMA_VERSION,
  physicalAssetCategories,
  physicalLinkActions,
  physicalLinkStatuses,
  type PhysicalAsset,
  type PhysicalAssetDetail,
  type PhysicalAssetDetailRequest,
  type PhysicalAssetDraft,
  type PhysicalLink,
  type PhysicalLinksMutation,
  type PhysicalLinksMutationResponse,
  type PhysicalLinksSnapshot,
} from "./types.ts";
import { count, date, exact, oneOf, record, revision, text, timestamp, uuid } from "./validation.ts";

const assetKeys = ["id", "name", "category", "location", "manufacturer", "model",
  "serialNumberMasked", "warrantyDueAt", "nextServiceAt", "maintenanceNotes", "createdAt", "updatedAt"];
const draftKeys = ["name", "category", "location", "manufacturer", "model", "serialNumber",
  "warrantyDueAt", "nextServiceAt", "maintenanceNotes"];
const linkKeys = ["id", "name", "resourceId", "status", "expiresAt", "lastUsedAt", "useCount",
  "createdAt", "updatedAt"];

function parseAsset(value: unknown): PhysicalAsset {
  const asset = record(value, "Physical Link item"); exact(asset, assetKeys, "Physical Link item");
  return { id: uuid(asset.id, "Item ID"), name: text(asset.name, "Item name", 120),
    category: oneOf(asset.category, physicalAssetCategories, "Item category"),
    location: text(asset.location, "Item location", 120, true),
    manufacturer: text(asset.manufacturer, "Item manufacturer", 120, true),
    model: text(asset.model, "Item model", 120, true),
    serialNumberMasked: text(asset.serialNumberMasked, "Masked serial number", 16, true),
    warrantyDueAt: timestamp(asset.warrantyDueAt, "Warranty date", true),
    nextServiceAt: timestamp(asset.nextServiceAt, "Service date", true),
    maintenanceNotes: text(asset.maintenanceNotes, "Maintenance notes", 1_000, true),
    createdAt: timestamp(asset.createdAt, "Item creation date"),
    updatedAt: timestamp(asset.updatedAt, "Item update date") };
}

function parseLink(value: unknown): PhysicalLink {
  const link = record(value, "Physical Link tag"); exact(link, linkKeys, "Physical Link tag");
  return { id: uuid(link.id, "Tag ID"), name: text(link.name, "Tag name", 120),
    resourceId: uuid(link.resourceId, "Linked item ID"),
    status: oneOf(link.status, physicalLinkStatuses, "Tag status"),
    expiresAt: timestamp(link.expiresAt, "Tag expiry", true),
    lastUsedAt: timestamp(link.lastUsedAt, "Tag use date", true),
    useCount: count(link.useCount, "Tag use count"),
    createdAt: timestamp(link.createdAt, "Tag creation date"),
    updatedAt: timestamp(link.updatedAt, "Tag update date") };
}

function parseDraft(value: unknown): PhysicalAssetDraft {
  const draft = record(value, "Physical Link item"); exact(draft, draftKeys, "Physical Link item");
  return { name: text(draft.name, "Item name", 120),
    category: oneOf(draft.category, physicalAssetCategories, "Item category"),
    location: text(draft.location, "Item location", 120, true),
    manufacturer: text(draft.manufacturer, "Item manufacturer", 120, true),
    model: text(draft.model, "Item model", 120, true),
    serialNumber: text(draft.serialNumber, "Serial number", 100, true),
    warrantyDueAt: date(draft.warrantyDueAt, "Warranty date"),
    nextServiceAt: date(draft.nextServiceAt, "Service date"),
    maintenanceNotes: text(draft.maintenanceNotes, "Maintenance notes", 1_000, true) };
}

export function parsePhysicalLinksSnapshot(value: unknown): PhysicalLinksSnapshot {
  const snapshot = record(value, "Physical Links response");
  exact(snapshot, ["schemaVersion", "revision", "detailsComplete", "assets", "links"],
    "Physical Links response");
  if (snapshot.schemaVersion !== PHYSICAL_LINKS_SCHEMA_VERSION || !Array.isArray(snapshot.assets)
    || snapshot.assets.length > 200 || !Array.isArray(snapshot.links) || snapshot.links.length > 400
    || typeof snapshot.detailsComplete !== "boolean") {
    throw new Error("Physical Links response is invalid.");
  }
  const assets = snapshot.assets.map(parseAsset); const links = snapshot.links.map(parseLink);
  if (new Set(assets.map((item) => item.id)).size !== assets.length
    || new Set(links.map((item) => item.id)).size !== links.length) {
    throw new Error("Physical Links response contains duplicate records.");
  }
  return { schemaVersion: PHYSICAL_LINKS_SCHEMA_VERSION, revision: revision(snapshot.revision),
    detailsComplete: snapshot.detailsComplete, assets, links };
}

export function parsePhysicalAssetDetailRequest(value: unknown): PhysicalAssetDetailRequest {
  const request = record(value, "Physical Link detail request");
  exact(request, ["assetId"], "Physical Link detail request");
  return { assetId: uuid(request.assetId, "Item ID") };
}

export function parsePhysicalAssetDetail(value: unknown): PhysicalAssetDetail {
  const detail = record(value, "Physical Link detail");
  exact(detail, ["schemaVersion", "asset"], "Physical Link detail");
  if (detail.schemaVersion !== PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION) {
    throw new Error("Physical Link detail is invalid.");
  }
  return { schemaVersion: PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
    asset: parseAsset(detail.asset) };
}

export function parsePhysicalLinksMutation(value: unknown): PhysicalLinksMutation {
  const mutation = record(value, "Physical Links update"); const operation = mutation.operation;
  if (operation === "CREATE_ASSET") { exact(mutation, ["operation", "revision", "asset"], "Physical Links update");
    return { operation, revision: revision(mutation.revision), asset: parseDraft(mutation.asset) }; }
  if (operation === "CREATE_LINK") { exact(mutation,
    ["operation", "revision", "assetId", "name", "expiresAt"], "Physical Links update");
    return { operation, revision: revision(mutation.revision), assetId: uuid(mutation.assetId, "Item ID"),
      name: text(mutation.name, "Tag name", 120), expiresAt: date(mutation.expiresAt, "Tag expiry") }; }
  if (operation === "REPLACE_LINK") { exact(mutation,
    ["operation", "revision", "linkId"], "Physical Links update");
    return { operation, revision: revision(mutation.revision), linkId: uuid(mutation.linkId, "Tag ID") }; }
  if (operation !== "MANAGE_LINK") throw new Error("Physical Links operation is invalid.");
  exact(mutation, ["operation", "revision", "linkId", "action", "value"], "Physical Links update");
  const action = oneOf(mutation.action, physicalLinkActions, "Tag action");
  const actionValue = action === "RENAME" ? text(mutation.value, "Tag name", 120)
    : action === "REASSIGN" ? uuid(mutation.value, "Item ID") : mutation.value === null ? null
      : (() => { throw new Error("Tag action value is invalid."); })();
  return { operation, revision: revision(mutation.revision), linkId: uuid(mutation.linkId, "Tag ID"),
    action, value: actionValue };
}

export function parsePhysicalLinksMutationResponse(value: unknown): PhysicalLinksMutationResponse {
  const response = record(value, "Physical Links update response");
  exact(response, ["snapshot", "newLink"], "Physical Links update response");
  let newLink = null;
  if (response.newLink !== null) { const link = record(response.newLink, "New Physical Link");
    exact(link, ["id", "path"], "New Physical Link"); newLink = { id: uuid(link.id, "Tag ID"),
      path: text(link.path, "Private link path", 256) };
    if (!/^\/p\/[A-Za-z0-9_-]{20,64}\/[A-Za-z0-9_-]{40,96}$/.test(newLink.path)) {
      throw new Error("Private link path is invalid.");
    } }
  return { snapshot: parsePhysicalLinksSnapshot(response.snapshot), newLink };
}
