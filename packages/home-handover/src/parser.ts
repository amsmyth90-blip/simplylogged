import {
  handoverResourceTypes,
  HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
  HOME_HANDOVER_SCHEMA_VERSION,
  type HandoverCandidate,
  type HandoverDraft,
  type HandoverItem,
  type HandoverPublication,
  type HandoverSharedItem,
  type HomeHandoverMutation,
  type HomeHandoverDetail,
  type HomeHandoverDetailRequest,
  type HomeHandoverSnapshot,
  type ReceivedHandover,
} from "./types.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value: unknown, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} is invalid.`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[], name: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))
    || keys.some((key) => !(key in value))) throw new Error(`${name} is invalid.`);
}
function text(value: unknown, maximum: number, name: string, allowEmpty = false) {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) {
    throw new Error(`${name} is invalid.`);
  }
  return value.trim();
}
function uuid(value: unknown, name: string) {
  const result = text(value, 50, name);
  if (!uuidPattern.test(result)) throw new Error(`${name} is invalid.`);
  return result;
}
function timestamp(value: unknown, name: string) {
  const result = text(value, 40, name);
  if (!Number.isFinite(Date.parse(result))) throw new Error(`${name} is invalid.`);
  return result;
}
function email(value: unknown) {
  const result = text(value, 254, "Recipient email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error("Recipient email is invalid.");
  return result;
}
function resourceType(value: unknown) {
  if (typeof value !== "string" || !handoverResourceTypes.includes(value as never)) {
    throw new Error("Handover resource type is invalid.");
  }
  return value as HandoverCandidate["resourceType"];
}
function candidateFields(item: Record<string, unknown>): HandoverCandidate {
  if (typeof item.selected !== "boolean") throw new Error("Handover selection is invalid.");
  return { resourceType: resourceType(item.resourceType), resourceId: uuid(item.resourceId, "Resource ID"),
    label: text(item.label, 160, "Candidate label"), detail: text(item.detail, 400, "Candidate detail", true),
    selected: item.selected };
}
function candidate(value: unknown): HandoverCandidate {
  const item = object(value, "Handover candidate");
  exact(item, ["resourceType", "resourceId", "label", "detail", "selected"], "Handover candidate");
  return candidateFields(item);
}
function draft(value: unknown): HandoverDraft {
  const item = object(value, "Handover draft");
  exact(item, ["id", "name", "revision"], "Handover draft");
  return { id: uuid(item.id, "Draft ID"), name: text(item.name, 120, "Draft name"),
    revision: timestamp(item.revision, "Draft revision") };
}
function selectedItem(value: unknown): HandoverItem {
  const item = object(value, "Handover item");
  exact(item, ["id", "resourceType", "resourceId", "label", "detail", "selected", "addedAt"],
    "Handover item");
  const base = candidateFields(item);
  if (!base.selected) throw new Error("Handover item is invalid.");
  return { ...base, id: uuid(item.id, "Handover item ID"),
    addedAt: timestamp(item.addedAt, "Handover item date") };
}
function sharedItem(value: unknown): HandoverSharedItem {
  const item = object(value, "Shared handover item");
  exact(item, ["id", "resourceType", "label", "detail"], "Shared handover item");
  return { id: uuid(item.id, "Shared handover item ID"), resourceType: resourceType(item.resourceType),
    label: text(item.label, 160, "Shared handover label"),
    detail: text(item.detail, 400, "Shared handover detail", true) };
}
function publication(value: unknown): HandoverPublication {
  const item = object(value, "Handover publication");
  exact(item, ["id", "recipientEmail", "publishedAt", "expiresAt", "revision", "itemCount"],
    "Handover publication");
  if (!Number.isSafeInteger(item.itemCount) || Number(item.itemCount) < 1
    || Number(item.itemCount) > 200) throw new Error("Handover publication is invalid.");
  return { id: uuid(item.id, "Publication ID"), recipientEmail: email(item.recipientEmail),
    publishedAt: timestamp(item.publishedAt, "Publication date"),
    expiresAt: timestamp(item.expiresAt, "Publication expiry"),
    revision: timestamp(item.revision, "Publication revision"), itemCount: Number(item.itemCount) };
}
function receivedHandover(value: unknown): ReceivedHandover {
  const item = object(value, "Received handover");
  exact(item, ["id", "name", "publishedAt", "expiresAt", "items"], "Received handover");
  if (!Array.isArray(item.items) || item.items.length < 1 || item.items.length > 200) {
    throw new Error("Received handover is invalid.");
  }
  return { id: uuid(item.id, "Received handover ID"), name: text(item.name, 120, "Handover name"),
    publishedAt: timestamp(item.publishedAt, "Publication date"),
    expiresAt: timestamp(item.expiresAt, "Publication expiry"), items: item.items.map(sharedItem) };
}

export function parseHomeHandoverSnapshot(value: unknown): HomeHandoverSnapshot {
  const item = object(value, "Home Handover response");
  exact(item, ["schemaVersion", "detailsComplete", "draft", "candidates", "items", "publication",
    "received", "exclusions"],
    "Home Handover response");
  if (item.schemaVersion !== HOME_HANDOVER_SCHEMA_VERSION || !Array.isArray(item.candidates)
    || item.candidates.length > 600 || !Array.isArray(item.items) || item.items.length > 200
    || !Array.isArray(item.received) || item.received.length > 20
    || !Array.isArray(item.exclusions) || item.exclusions.length > 12
    || typeof item.detailsComplete !== "boolean") {
    throw new Error("Home Handover response is invalid.");
  }
  return { schemaVersion: HOME_HANDOVER_SCHEMA_VERSION, detailsComplete: item.detailsComplete,
    draft: item.draft === null ? null : draft(item.draft), candidates: item.candidates.map(candidate),
    items: item.items.map(selectedItem),
    publication: item.publication === null ? null : publication(item.publication),
    received: item.received.map(receivedHandover), exclusions: item.exclusions.map((entry) =>
      text(entry, 160, "Handover exclusion")) };
}

export function parseHomeHandoverMutation(value: unknown): HomeHandoverMutation {
  const item = object(value, "Home Handover change");
  if (item.operation === "CREATE_PACK") {
    exact(item, ["operation", "name"], "Home Handover change");
    return { operation: "CREATE_PACK", name: text(item.name, 120, "Draft name") };
  }
  if (item.operation === "SET_ITEM") {
    exact(item, ["operation", "revision", "packId", "resourceType", "resourceId", "selected"],
      "Home Handover change");
    if (typeof item.selected !== "boolean") throw new Error("Handover selection is invalid.");
    return { operation: "SET_ITEM", revision: timestamp(item.revision, "Draft revision"),
      packId: uuid(item.packId, "Draft ID"), resourceType: resourceType(item.resourceType),
      resourceId: uuid(item.resourceId, "Resource ID"), selected: item.selected };
  }
  if (item.operation === "PUBLISH") {
    exact(item, ["operation", "revision", "packId", "recipientEmail"], "Home Handover change");
    return { operation: "PUBLISH", revision: timestamp(item.revision, "Draft revision"),
      packId: uuid(item.packId, "Draft ID"), recipientEmail: email(item.recipientEmail) };
  }
  if (item.operation === "REVOKE") {
    exact(item, ["operation", "publicationId", "publicationRevision"], "Home Handover change");
    return { operation: "REVOKE", publicationId: uuid(item.publicationId, "Publication ID"),
      publicationRevision: timestamp(item.publicationRevision, "Publication revision") };
  }
  throw new Error("Home Handover change is invalid.");
}

export function parseHomeHandoverDetailRequest(value: unknown): HomeHandoverDetailRequest {
  const item = object(value, "Home Handover detail request");
  if (item.scope === "OWNER") {
    exact(item, ["scope", "resourceType", "resourceId"], "Home Handover detail request");
    return { scope: "OWNER", resourceType: resourceType(item.resourceType),
      resourceId: uuid(item.resourceId, "Resource ID") };
  }
  if (item.scope === "RECEIVED") {
    exact(item, ["scope", "publicationId", "itemId"], "Home Handover detail request");
    return { scope: "RECEIVED", publicationId: uuid(item.publicationId, "Publication ID"),
      itemId: uuid(item.itemId, "Handover item ID") };
  }
  throw new Error("Home Handover detail request is invalid.");
}

export function homeHandoverDetailKey(request: HomeHandoverDetailRequest) {
  return request.scope === "OWNER"
    ? `OWNER:${request.resourceType}:${request.resourceId}`
    : `RECEIVED:${request.publicationId}:${request.itemId}`;
}

export function parseHomeHandoverDetail(value: unknown): HomeHandoverDetail {
  const item = object(value, "Home Handover detail");
  const request = item.scope === "OWNER"
    ? parseHomeHandoverDetailRequest({ scope: item.scope, resourceType: item.resourceType,
      resourceId: item.resourceId })
    : parseHomeHandoverDetailRequest({ scope: item.scope, publicationId: item.publicationId,
      itemId: item.itemId });
  const keys = request.scope === "OWNER"
    ? ["schemaVersion", "scope", "resourceType", "resourceId", "label", "detail"]
    : ["schemaVersion", "scope", "publicationId", "itemId", "label", "detail"];
  exact(item, keys, "Home Handover detail");
  if (item.schemaVersion !== HOME_HANDOVER_DETAIL_SCHEMA_VERSION) {
    throw new Error("Home Handover detail is invalid.");
  }
  return { ...request, schemaVersion: HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
    label: text(item.label, 160, "Handover label"),
    detail: text(item.detail, 400, "Handover detail", true) };
}
