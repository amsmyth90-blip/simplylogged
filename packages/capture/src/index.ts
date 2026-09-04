export const documentCategories = [
  "Identity",
  "Home & Property",
  "Finance",
  "Legal & Estate",
  "Health & Medical",
  "Memories",
] as const;

export const estateRooms = [
  "Attic",
  "Office",
  "Garage",
  "Bedroom",
  "Family Room",
  "Kitchen",
  "Garden",
  "Driveway",
  "Safe Room",
  "Mailbox",
] as const;

export type DocumentCategory = (typeof documentCategories)[number];
export type EstateRoom = (typeof estateRooms)[number];

export type DocumentExtractedField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: "uploaded_document";
  userConfirmed: false;
};

export type DocumentExtraction = {
  title: string;
  issuer: string;
  category: DocumentCategory;
  suggestedRoom: EstateRoom;
  summary: string;
  reminderTitle: string;
  reminderTimeLabel: string;
  detectedDocumentType: string;
  dueDate: string;
  actionItems: string[];
  extractedText: string;
  confidence: number;
  extractedFields: DocumentExtractedField[];
};

function text(record: Record<string, unknown>, key: string, maximum: number) {
  const value = record[key];
  if (typeof value !== "string" || value.length > maximum) throw new Error(`Capture ${key} is invalid.`);
  return value;
}

function confidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Capture confidence is invalid.");
  }
  return value;
}

function fields(value: unknown): DocumentExtractedField[] {
  if (!Array.isArray(value) || value.length > 24) throw new Error("Capture fields are invalid.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Capture field is invalid.");
    const item = entry as Record<string, unknown>;
    if (item.source !== "uploaded_document" || item.userConfirmed !== false) {
      throw new Error("Capture field provenance is invalid.");
    }
    return {
      key: text(item, "key", 80),
      label: text(item, "label", 120),
      value: text(item, "value", 500),
      confidence: confidence(item.confidence),
      source: "uploaded_document",
      userConfirmed: false,
    };
  });
}

export function parseDocumentExtraction(value: unknown): DocumentExtraction {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The document analysis is invalid.");
  }
  const item = value as Record<string, unknown>;
  const category = text(item, "category", 160);
  const suggestedRoom = text(item, "suggestedRoom", 160);
  if (!documentCategories.includes(category as DocumentCategory)) throw new Error("Capture category is invalid.");
  if (!estateRooms.includes(suggestedRoom as EstateRoom)) throw new Error("Capture area is invalid.");
  if (!Array.isArray(item.actionItems) || item.actionItems.length > 24
    || item.actionItems.some((entry) => typeof entry !== "string" || entry.length > 500)) {
    throw new Error("Capture actions are invalid.");
  }
  const dueDate = text(item, "dueDate", 32);
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("Capture due date is invalid.");
  return {
    title: text(item, "title", 240),
    issuer: text(item, "issuer", 240),
    category: category as DocumentCategory,
    suggestedRoom: suggestedRoom as EstateRoom,
    summary: text(item, "summary", 2_000),
    reminderTitle: text(item, "reminderTitle", 240),
    reminderTimeLabel: text(item, "reminderTimeLabel", 120),
    detectedDocumentType: text(item, "detectedDocumentType", 120),
    dueDate,
    actionItems: item.actionItems as string[],
    extractedText: text(item, "extractedText", 20_000),
    confidence: confidence(item.confidence),
    extractedFields: fields(item.extractedFields),
  };
}

export function parseCaptureAnalysisResponse(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("The capture response is invalid.");
  const item = value as Record<string, unknown>;
  if (typeof item.captureJobId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.captureJobId)) {
    throw new Error("The capture job is invalid.");
  }
  return { captureJobId: item.captureJobId, extraction: parseDocumentExtraction(item.extraction) };
}
