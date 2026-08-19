import type { LifeSourceType, ProvenanceRecord } from "@/lib/life-graph/types";

export function createProvenanceRecord(input: {
  userId: string;
  sourceType: LifeSourceType;
  sourceLabel: string;
  sourceId?: string;
  createdBy?: ProvenanceRecord["createdBy"];
  confidence?: number;
  notes?: string;
  now?: string;
}): ProvenanceRecord {
  const createdAt = input.now ?? new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    createdBy: input.createdBy ?? "system",
    confidence: input.confidence,
    notes: input.notes,
    createdAt
  };
}

export function provenanceLabelForSource(sourceType: LifeSourceType) {
  switch (sourceType) {
    case "email_import":
      return "Forwarded email";
    case "share_sheet":
      return "Shared to DiaryDock";
    case "document_upload":
      return "Uploaded document";
    case "ocr":
      return "OCR extraction";
    case "ai_extraction":
      return "AI extraction";
    case "ai_inference":
      return "AI suggestion";
    case "migration":
      return "Migrated DiaryDock record";
    case "system_rule":
      return "DiaryDock rule";
    case "manual":
    default:
      return "Manual entry";
  }
}

