import type { Reminder, VaultDocument } from "@/lib/mock-data";
import type { LifeEntity, LifeEvent, LifeSensitivityTier } from "@/lib/life-graph/types";

function nowIso() {
  return new Date().toISOString();
}

function sensitivityForDocument(document: VaultDocument): LifeSensitivityTier {
  const text = `${document.category} ${document.roomName ?? ""} ${document.title}`.toLowerCase();

  if (text.includes("will") || text.includes("legal") || text.includes("estate")) {
    return "highly_sensitive";
  }

  if (text.includes("health") || text.includes("medical") || text.includes("identity") || text.includes("passport")) {
    return "sensitive";
  }

  if (text.includes("finance") || text.includes("insurance") || text.includes("bill")) {
    return "private";
  }

  return "standard";
}

export function projectDocumentToLifeEntity(document: VaultDocument, userId: string): LifeEntity {
  const now = nowIso();

  return {
    id: `document:${document.id}`,
    userId,
    entityType: "document",
    title: document.title,
    summary: document.extractionSummary,
    status: document.reviewStatus === "needs-review" ? "draft" : "active",
    sensitivity: sensitivityForDocument(document),
    sourceType: document.storagePath ? "document_upload" : "manual",
    sourceId: document.id,
    metadata: {
      category: document.category,
      kind: document.kind,
      roomId: document.roomId,
      roomName: document.roomName,
      issuer: document.issuer,
      dueDate: document.dueDate,
      reviewStatus: document.reviewStatus
    },
    createdAt: now,
    updatedAt: now
  };
}

export function projectReminderToLifeEvent(reminder: Reminder, userId: string): LifeEvent {
  const now = nowIso();

  return {
    id: `reminder:${reminder.id}`,
    userId,
    entityId: reminder.documentId ? `document:${reminder.documentId}` : undefined,
    documentId: reminder.documentId,
    title: reminder.title,
    eventType: "custom",
    startsAt: now,
    status: reminder.group === "done" ? "completed" : reminder.group === "today" ? "due" : "upcoming",
    severity: reminder.priority === "high" ? "high" : reminder.priority === "low" ? "low" : "medium",
    sourceType: "manual",
    sourceId: reminder.id,
    createdAt: now,
    updatedAt: now
  };
}

