export const lifeEntityTypes = [
  "person",
  "household",
  "home",
  "room",
  "document",
  "provider",
  "vehicle",
  "pet",
  "policy",
  "bill",
  "contract",
  "trip",
  "task",
  "event",
  "preference",
  "asset",
  "memory"
] as const;

export type LifeEntityType = (typeof lifeEntityTypes)[number];

export const lifeRelationshipTypes = [
  "belongs_to",
  "owned_by",
  "managed_by",
  "linked_to",
  "evidenced_by",
  "provided_by",
  "insured_by",
  "paid_by",
  "requires",
  "created_from",
  "visible_in_room",
  "has_task",
  "has_event",
  "has_document"
] as const;

export type LifeRelationshipType = (typeof lifeRelationshipTypes)[number];

export const lifeSensitivityTiers = ["standard", "private", "sensitive", "highly_sensitive"] as const;

export type LifeSensitivityTier = (typeof lifeSensitivityTiers)[number];

export const lifeFactStatuses = ["suggested", "needs_review", "confirmed", "rejected", "stale"] as const;

export type LifeFactStatus = (typeof lifeFactStatuses)[number];

export const lifeSourceTypes = [
  "manual",
  "document_upload",
  "email_import",
  "share_sheet",
  "ocr",
  "ai_extraction",
  "ai_inference",
  "migration",
  "system_rule"
] as const;

export type LifeSourceType = (typeof lifeSourceTypes)[number];

export type LifeEntity = {
  id: string;
  userId: string;
  householdId?: string;
  entityType: LifeEntityType;
  title: string;
  summary?: string;
  status: "active" | "draft" | "archived" | "deleted";
  sensitivity: LifeSensitivityTier;
  sourceType: LifeSourceType;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LifeRelationship = {
  id: string;
  userId: string;
  householdId?: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: LifeRelationshipType;
  confidence?: number;
  provenanceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  endedAt?: string;
};

export type LifeFact = {
  id: string;
  userId: string;
  entityId: string;
  key: string;
  value: string | number | boolean | null;
  valueType: "string" | "number" | "boolean" | "date" | "money" | "json";
  status: LifeFactStatus;
  confidence?: number;
  provenanceId?: string;
  createdAt: string;
  confirmedAt?: string;
};

export type LifeEvent = {
  id: string;
  userId: string;
  householdId?: string;
  entityId?: string;
  documentId?: string;
  title: string;
  eventType:
    | "renewal"
    | "expiry"
    | "appointment"
    | "payment_due"
    | "review_due"
    | "maintenance_due"
    | "import_review"
    | "custom";
  startsAt: string;
  endsAt?: string;
  status: "upcoming" | "due" | "overdue" | "completed" | "dismissed";
  severity: "low" | "medium" | "high";
  sourceType: LifeSourceType;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProvenanceRecord = {
  id: string;
  userId: string;
  sourceType: LifeSourceType;
  sourceId?: string;
  sourceLabel: string;
  createdBy: "user" | "system" | "ai" | "import";
  confidence?: number;
  notes?: string;
  createdAt: string;
};

