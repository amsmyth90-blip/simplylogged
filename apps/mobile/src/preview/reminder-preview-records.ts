import type { LocalRecord, SyncConflict } from "@diarydock/offline-store";

export const ownerId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const now = "2026-09-01T09:00:00.000Z";

function reminder(
  id: string,
  title: string,
  group: "done" | "later" | "today" | "week",
  priority: "high" | "low" | "normal",
  details: Record<string, string | number> = {},
): LocalRecord {
  return {
    id,
    entityType: "reminder",
    scope: { kind: "USER", id: ownerId },
    revision: "4",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      title,
      group,
      timeLabel:
        group === "today"
          ? "Today"
          : group === "week"
            ? "This week"
            : "18 September",
      priority,
      origin: "USER_CREATED",
      reminderType: "custom",
      timeZone: "Europe/London",
      ...details,
    },
    syncState: "CLEAN",
  };
}

const conflictedReminder = reminder(
  "65f56887-c667-4d80-b0e5-bb765f120a2f",
  "Review energy tariff",
  "later",
  "low",
  { assignedTo: "Amy" },
);
conflictedReminder.syncState = "CONFLICT";

export const initialRecords: LocalRecord[] = [
  reminder(
    "10468472-b1e5-4dd4-8b5a-456c3db52931",
    "Renew home insurance",
    "today",
    "high",
    {
      documentId: "home-insurance",
      documentTitle: "Home insurance policy",
      roomId: "office",
      roomName: "Office",
    },
  ),
  reminder(
    "451b9141-b87e-4a8b-8510-7052b61f84a2",
    "Put recycling out",
    "today",
    "normal",
    { repeat: "Weekly" },
  ),
  reminder(
    "94ab1443-e23a-4e70-a7a9-40882eccab45",
    "Book the annual boiler service",
    "week",
    "high",
  ),
  conflictedReminder,
  reminder(
    "18517025-ab4b-4c9a-b91b-c8bdf0b4aadd",
    "Passport renewal window",
    "week",
    "normal",
    {
      origin: "SYSTEM_GENERATED",
      reminderType: "document-renewal",
      sourceResourceType: "document",
      sourceResourceId: "passport",
      sourceDateKey: "passport-expiry",
      sourceDueAt: "2026-10-18T09:00:00.000Z",
      dueAt: "2026-09-18T09:00:00.000Z",
      ruleId: "renewal-window",
      ruleVersion: 1,
    },
  ),
  {
    id: "8b621283-a10e-470b-a5af-d850ddf2e8ae",
    entityType: "document",
    scope: { kind: "USER" as const, id: ownerId },
    revision: "2",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      documentId: "home-insurance-policy",
      title: "Home insurance policy",
      category: "Home & Property",
      kind: "PDF",
      size: "1.2 MB",
      roomId: "office",
      roomName: "Office",
      reviewStatus: "reviewed",
      emergencyVisible: true,
      hasStoredFile: true,
    },
    syncState: "CLEAN" as const,
  },
  {
    id: "82a8d77d-a84d-4932-87a5-b90c6cc1ce7b",
    entityType: "document",
    scope: { kind: "USER" as const, id: ownerId },
    revision: "1",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      documentId: "council-tax-letter",
      title: "Council tax statement",
      category: "Home & Property",
      kind: "Scan",
      size: "840 KB",
      roomId: "office",
      roomName: "Office",
      reviewStatus: "needs-review",
      emergencyVisible: false,
      hasStoredFile: true,
    },
    syncState: "CLEAN" as const,
  },
];

export const initialConflicts: SyncConflict[] = [
  {
    idempotencyKey: "3189e61a-8172-4aac-b7c8-ecc2cfce1c2f",
    recordId: conflictedReminder.id,
    entityType: "reminder",
    localOperation: "UPSERT",
    localSchemaVersion: 1,
    localPayload: conflictedReminder.payload,
    serverRecord: {
      ...conflictedReminder,
      revision: "5",
      payload: {
        ...conflictedReminder.payload,
        title: "Review electricity tariff",
      },
    },
    detectedAt: now,
  },
];
