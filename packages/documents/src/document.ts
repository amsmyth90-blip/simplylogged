import type { JsonObject } from "@diarydock/contracts";
import type { LocalRecord, LocalSyncState } from "@diarydock/offline-store";

export type DocumentKind = "Image" | "Note" | "PDF" | "Scan";
export type DocumentReviewStatus = "needs-review" | "reviewed";

export type DocumentSummary = {
  syncId: string;
  id: string;
  title: string;
  category: string;
  kind: DocumentKind;
  size: string;
  roomId?: string;
  roomName?: string;
  issuer?: string;
  dueDate?: string;
  reviewStatus: DocumentReviewStatus;
  emergencyVisible: boolean;
  hasStoredFile: boolean;
  fileVersion?: string;
  updatedAt: string;
  revision: string;
  syncState: LocalSyncState;
};

export type EditableDocument = Pick<
  DocumentSummary,
  | "category"
  | "dueDate"
  | "emergencyVisible"
  | "issuer"
  | "reviewStatus"
  | "roomId"
  | "roomName"
  | "title"
>;

function requiredText(payload: JsonObject, key: string, maximum: number) {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`Document ${key} is invalid.`);
  }
  return value;
}

function optionalText(payload: JsonObject, key: string, maximum: number) {
  const value = payload[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) {
    throw new Error(`Document ${key} is invalid.`);
  }
  return value || undefined;
}

function booleanValue(payload: JsonObject, key: string) {
  const value = payload[key];
  if (typeof value !== "boolean") throw new Error(`Document ${key} is invalid.`);
  return value;
}

function kind(payload: JsonObject): DocumentKind {
  const value = requiredText(payload, "kind", 16);
  if (value === "Image" || value === "Note" || value === "PDF" || value === "Scan") return value;
  throw new Error("Document kind is invalid.");
}

function reviewStatus(payload: JsonObject): DocumentReviewStatus {
  const value = requiredText(payload, "reviewStatus", 24);
  if (value === "needs-review" || value === "reviewed") return value;
  throw new Error("Document review status is invalid.");
}

function dueDate(payload: JsonObject) {
  const value = optionalText(payload, "dueDate", 32);
  if (value && Number.isNaN(new Date(value).valueOf())) {
    throw new Error("Document due date is invalid.");
  }
  return value;
}

function fileVersion(payload: JsonObject) {
  const value = optionalText(payload, "fileVersion", 64);
  if (value && !/^[0-9a-f]{32}$/.test(value)) throw new Error("Document file version is invalid.");
  return value;
}

export function parseDocument(record: LocalRecord): DocumentSummary {
  if (record.entityType !== "document") throw new Error("The record is not a document.");
  return {
    syncId: record.id,
    id: requiredText(record.payload, "documentId", 128),
    title: requiredText(record.payload, "title", 240),
    category: requiredText(record.payload, "category", 160),
    kind: kind(record.payload),
    size: requiredText(record.payload, "size", 80),
    roomId: optionalText(record.payload, "roomId", 128),
    roomName: optionalText(record.payload, "roomName", 160),
    issuer: optionalText(record.payload, "issuer", 240),
    dueDate: dueDate(record.payload),
    reviewStatus: reviewStatus(record.payload),
    emergencyVisible: booleanValue(record.payload, "emergencyVisible"),
    hasStoredFile: booleanValue(record.payload, "hasStoredFile"),
    fileVersion: fileVersion(record.payload),
    updatedAt: record.updatedAt,
    revision: record.revision,
    syncState: record.syncState,
  };
}

function put(payload: JsonObject, key: string, value: string | undefined) {
  if (value) payload[key] = value;
}

export function documentPayload(existing: DocumentSummary, draft: EditableDocument): JsonObject {
  const payload: JsonObject = {
    documentId: existing.id,
    title: draft.title.trim(),
    category: draft.category.trim(),
    kind: existing.kind,
    size: existing.size,
    reviewStatus: draft.reviewStatus,
    emergencyVisible: draft.emergencyVisible,
    hasStoredFile: existing.hasStoredFile,
  };
  put(payload, "fileVersion", existing.fileVersion);
  put(payload, "roomId", draft.roomId?.trim());
  put(payload, "roomName", draft.roomName?.trim());
  put(payload, "issuer", draft.issuer?.trim());
  put(payload, "dueDate", draft.dueDate);
  parseDocument({
    id: existing.syncId,
    entityType: "document",
    scope: { kind: "USER", id: "validation" },
    revision: existing.revision,
    schemaVersion: 1,
    updatedAt: existing.updatedAt,
    deletedAt: null,
    payload,
    syncState: existing.syncState,
  });
  return payload;
}
