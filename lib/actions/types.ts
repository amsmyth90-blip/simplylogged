export const actionRiskLevels = ["low", "medium", "high", "very_high"] as const;

export type ActionRiskLevel = (typeof actionRiskLevels)[number];

export const actionStatuses = [
  "proposed",
  "awaiting_permission",
  "approved",
  "running",
  "completed",
  "failed",
  "cancelled",
  "dismissed"
] as const;

export type ActionStatus = (typeof actionStatuses)[number];

export const actionTypes = [
  "classify_document",
  "link_document",
  "create_reminder",
  "create_task",
  "update_record",
  "share_document",
  "draft_email",
  "contact_provider",
  "cancel_subscription",
  "make_purchase",
  "submit_form"
] as const;

export type ActionType = (typeof actionTypes)[number];

export type ActionRequest = {
  id: string;
  userId: string;
  householdId?: string;
  actionType: ActionType;
  riskLevel: ActionRiskLevel;
  status: ActionStatus;
  title: string;
  summary: string;
  reason?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  sourceDocumentId?: string;
  proposedPayload?: Record<string, unknown>;
  requiresConfirmation: boolean;
  requestedBy: "user" | "ai" | "system";
  createdAt: string;
  expiresAt?: string;
};

