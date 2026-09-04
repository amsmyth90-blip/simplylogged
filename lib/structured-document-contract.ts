import type { VaultDocument } from "@/lib/mock-data";

export const MAX_STRUCTURED_DOCUMENT_BYTES = 96 * 1024;

export type StructuredDocumentInput = {
  actionItems: string[];
  category: string;
  confidence: number | null;
  dueDate: string | null;
  emergencyVisible: boolean;
  extractedText: string | null;
  extractionSummary: string | null;
  id: string;
  issuer: string | null;
  kind: VaultDocument["kind"];
  mimeType: string | null;
  originalFileName: string | null;
  reviewReasons: string[];
  reviewStatus: "needs-review" | "reviewed";
  reviewedAt: string | null;
  roomId: string | null;
  roomName: string | null;
  size: string;
  storageBucket: string | null;
  storagePath: string | null;
  title: string;
};

const inputKeys = [
  "actionItems", "category", "confidence", "dueDate", "emergencyVisible",
  "extractedText", "extractionSummary", "id", "issuer", "kind", "mimeType",
  "originalFileName", "reviewReasons", "reviewStatus", "reviewedAt", "roomId",
  "roomName", "size", "storageBucket", "storagePath", "title",
] as const;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function text(value: unknown, maximum: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum
    || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`Invalid document ${label}.`);
  }
  return value.trim();
}

function optionalText(value: unknown, maximum: number, label: string) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > maximum
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error(`Invalid document ${label}.`);
  }
  return value.trim() || null;
}

function stringList(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > 25) {
    throw new Error(`Invalid document ${label}.`);
  }
  const items = value.map((item) => text(item, 500, label));
  if (new Set(items).size !== items.length) throw new Error(`Invalid document ${label}.`);
  return items;
}

function date(value: unknown) {
  const parsed = optionalText(value, 10, "due date");
  if (!parsed) return null;
  const valueDate = new Date(`${parsed}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)
    || Number.isNaN(valueDate.valueOf())
    || valueDate.toISOString().slice(0, 10) !== parsed) {
    throw new Error("Invalid document due date.");
  }
  return parsed;
}

export function structuredDocumentInput(document: VaultDocument): StructuredDocumentInput {
  return {
    actionItems: document.actionItems ?? [], category: document.category,
    confidence: document.confidence ?? null, dueDate: document.dueDate ?? null,
    emergencyVisible: Boolean(document.emergencyVisible),
    extractedText: document.extractedText ?? null,
    extractionSummary: document.extractionSummary ?? null, id: document.id,
    issuer: document.issuer ?? null, kind: document.kind,
    mimeType: document.mimeType ?? null, originalFileName: document.originalFileName ?? null,
    reviewReasons: document.reviewReasons ?? [],
    reviewStatus: document.reviewStatus ?? "reviewed",
    reviewedAt: document.reviewedAt ?? null, roomId: document.roomId ?? null,
    roomName: document.roomName ?? null, size: document.size,
    storageBucket: document.storageBucket ?? null,
    storagePath: document.storagePath ?? null, title: document.title,
  };
}

export function parseStructuredDocumentMutation(value: unknown): StructuredDocumentInput {
  if (!object(value) || !exactKeys(value, inputKeys)) {
    throw new Error("Invalid document update.");
  }
  const kind = value.kind;
  const status = value.reviewStatus;
  const confidence = value.confidence;
  if (kind !== "PDF" && kind !== "Scan" && kind !== "Note" && kind !== "Image") {
    throw new Error("Invalid document kind.");
  }
  if (status !== "needs-review" && status !== "reviewed") {
    throw new Error("Invalid document review status.");
  }
  if (typeof value.emergencyVisible !== "boolean"
    || (confidence !== null && (typeof confidence !== "number"
      || !Number.isFinite(confidence) || confidence < 0 || confidence > 1))) {
    throw new Error("Invalid document metadata.");
  }
  const mimeType = optionalText(value.mimeType, 120, "media type");
  if (mimeType && !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(mimeType)) {
    throw new Error("Invalid document media type.");
  }
  return {
    actionItems: stringList(value.actionItems, "actions"),
    category: text(value.category, 160, "category"), confidence,
    dueDate: date(value.dueDate), emergencyVisible: value.emergencyVisible,
    extractedText: optionalText(value.extractedText, 64_000, "extracted text"),
    extractionSummary: optionalText(value.extractionSummary, 4_000, "summary"),
    id: text(value.id, 128, "identifier"), issuer: optionalText(value.issuer, 240, "issuer"),
    kind, mimeType, originalFileName: optionalText(value.originalFileName, 255, "filename"),
    reviewReasons: stringList(value.reviewReasons, "review reasons"), reviewStatus: status,
    reviewedAt: optionalText(value.reviewedAt, 64, "reviewed label"),
    roomId: optionalText(value.roomId, 128, "room"),
    roomName: optionalText(value.roomName, 160, "room name"),
    size: text(value.size, 80, "size"),
    storageBucket: optionalText(value.storageBucket, 64, "storage bucket"),
    storagePath: optionalText(value.storagePath, 1_024, "storage path"),
    title: text(value.title, 240, "title"),
  };
}

export function parseStructuredDocumentDelete(value: unknown) {
  if (!object(value) || !exactKeys(value, ["documentId"])) {
    throw new Error("Invalid document deletion.");
  }
  return text(value.documentId, 128, "identifier");
}
