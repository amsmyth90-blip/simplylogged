import { documentCategories, estateRooms, type DocumentCategory, type EstateRoom } from "@diarydock/capture";
import { MAX_DOCUMENT_METADATA_BYTES } from "@diarydock/documents";

export type MobileUploadMetadata = {
  title: string;
  category: DocumentCategory;
  roomName: EstateRoom;
  issuer?: string;
  dueDate?: string;
  summary?: string;
  extractedText?: string;
  confidence?: number;
  actionItems: string[];
  captureJobId?: string;
  confirmedFields: Array<{ key: string; label: string; value: string; confidence: number }>;
  reminder?: { id: string; title: string; timeLabel: string };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedKeys = new Set(["actionItems", "captureJobId", "category", "confidence", "confirmedFields",
  "dueDate", "extractedText", "issuer", "reminder", "roomName", "summary", "title"]);

function optionalText(input: Record<string, unknown>, key: string, maximum: number) {
  const value = input[key];
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || value.length > maximum) throw new Error(`The document ${key} is invalid.`);
  return value;
}

function requiredText(input: Record<string, unknown>, key: string, maximum: number) {
  const value = optionalText(input, key, maximum)?.trim();
  if (!value) throw new Error(`The document ${key} is invalid.`);
  return value;
}

function parseFields(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 24) throw new Error("The confirmed document fields are invalid.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("A confirmed document field is invalid.");
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["confidence", "key", "label", "value"].includes(key))) {
      throw new Error("A confirmed document field is invalid.");
    }
    const confidence = item.confidence;
    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
      throw new Error("A confirmed document field is invalid.");
    }
    return {
      key: requiredText(item, "key", 80),
      label: requiredText(item, "label", 120),
      value: requiredText(item, "value", 500),
      confidence,
    };
  });
}

function parseReminder(value: unknown) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The reminder is invalid.");
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some((key) => !["id", "timeLabel", "title"].includes(key))) {
    throw new Error("The reminder is invalid.");
  }
  const reminder = {
    id: requiredText(item, "id", 64),
    title: requiredText(item, "title", 240),
    timeLabel: requiredText(item, "timeLabel", 120),
  };
  if (!uuidPattern.test(reminder.id)) throw new Error("The reminder identifier is invalid.");
  return reminder;
}

export function parseMobileUploadMetadata(value: unknown): MobileUploadMetadata | null {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The document details are invalid.");
  let encodedBytes: number;
  try {
    encodedBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    throw new Error("The document details are invalid.");
  }
  if (encodedBytes > MAX_DOCUMENT_METADATA_BYTES) throw new Error("The document details are too large.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    throw new Error("The document details contain unsupported fields.");
  }
  const title = requiredText(input, "title", 240);
  const category = requiredText(input, "category", 160);
  const roomName = requiredText(input, "roomName", 160);
  if (!documentCategories.includes(category as DocumentCategory)) throw new Error("The document category is invalid.");
  if (!estateRooms.includes(roomName as EstateRoom)) throw new Error("The document area is invalid.");
  const dueDate = optionalText(input, "dueDate", 32);
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("The document date is invalid.");
  const confidence = input.confidence;
  if (confidence !== undefined && (typeof confidence !== "number" || confidence < 0 || confidence > 1)) {
    throw new Error("The document confidence is invalid.");
  }
  const actionItems = input.actionItems ?? [];
  if (!Array.isArray(actionItems) || actionItems.length > 24
    || actionItems.some((entry) => typeof entry !== "string" || entry.length > 500)) {
    throw new Error("The document actions are invalid.");
  }
  const captureJobId = optionalText(input, "captureJobId", 64);
  if (captureJobId && !uuidPattern.test(captureJobId)) throw new Error("The capture job is invalid.");
  return {
    title,
    category: category as DocumentCategory,
    roomName: roomName as EstateRoom,
    issuer: optionalText(input, "issuer", 240),
    dueDate,
    summary: optionalText(input, "summary", 2_000),
    extractedText: optionalText(input, "extractedText", 20_000),
    confidence: confidence as number | undefined,
    actionItems: actionItems as string[],
    captureJobId,
    confirmedFields: parseFields(input.confirmedFields),
    reminder: parseReminder(input.reminder),
  };
}

export function persistedMobileUploadMetadata(metadata: MobileUploadMetadata) {
  return {
    title: metadata.title,
    category: metadata.category,
    roomName: metadata.roomName,
    issuer: metadata.issuer,
    dueDate: metadata.dueDate,
    summary: metadata.summary,
    extractedText: metadata.extractedText,
    confidence: metadata.confidence,
    actionItems: metadata.actionItems,
    reminder: metadata.reminder,
  };
}
