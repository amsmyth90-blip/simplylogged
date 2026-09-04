import "server-only";

import type { Reminder, VaultDocument } from "@/lib/mock-data";
import type { ResourceVisibility } from "@/lib/resource-access";

export type DiaryDockRecordRow = Record<string, unknown> & {
  id: string;
  created_at: string;
};

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function documentKind(value: unknown): VaultDocument["kind"] {
  return value === "PDF" || value === "Scan" || value === "Note" || value === "Image"
    ? value : "Scan";
}

function reviewStatus(value: unknown): VaultDocument["reviewStatus"] {
  return value === "needs-review" || value === "reviewed" ? value : "reviewed";
}

export function visibility(value: unknown): ResourceVisibility {
  return value === "HOUSEHOLD" || value === "SELECTED_MEMBERS" ? value : "PRIVATE";
}

function reminderGroup(value: unknown): Reminder["group"] {
  return value === "today" || value === "week" || value === "later" || value === "done"
    ? value : "today";
}

function reminderPriority(value: unknown): Reminder["priority"] {
  return value === "high" || value === "normal" || value === "low" ? value : "normal";
}

type DocumentAccess = {
  legacy: Map<string, string[]>;
  resources: Map<string, { id: string; ownerId: string; visibility: ResourceVisibility }>;
  selected: Map<string, string[]>;
};

export function projectDocuments(
  rows: DiaryDockRecordRow[],
  userId: string,
  access: DocumentAccess,
): VaultDocument[] {
  return rows.map((row) => {
    const shared = access.resources.get(String(row.id));
    return {
      id: String(row.id), title: String(row.title), category: String(row.category),
      kind: documentKind(row.kind), size: String(row.size_label ?? ""), updated: "Just now",
      ownerId: String(row.user_id), isOwnedByCurrentUser: String(row.user_id) === userId,
      storageBucket: row.storage_bucket ? String(row.storage_bucket) : undefined,
      storagePath: row.storage_path ? String(row.storage_path) : undefined,
      originalFileName: row.original_file_name ? String(row.original_file_name) : undefined,
      mimeType: row.mime_type ? String(row.mime_type) : undefined,
      roomId: row.room_id ? String(row.room_id) : undefined,
      roomName: row.room_name ? String(row.room_name) : undefined,
      issuer: row.issuer ? String(row.issuer) : undefined,
      dueDate: row.due_date ? String(row.due_date) : undefined,
      extractionSummary: row.extraction_summary ? String(row.extraction_summary) : undefined,
      extractedText: row.extracted_text ? String(row.extracted_text) : undefined,
      actionItems: stringArray(row.action_items),
      confidence: typeof row.confidence === "number" ? row.confidence : undefined,
      reviewStatus: reviewStatus(row.review_status), reviewReasons: stringArray(row.review_reasons),
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
      emergencyVisible: Boolean(row.emergency_visible),
      visibility: shared?.visibility ?? "PRIVATE",
      sharedWithUserIds: shared ? access.selected.get(shared.id) ?? [] : [],
      sharedWith: access.legacy.get(String(row.id)) ?? stringArray(row.shared_with),
    };
  });
}

export function projectReminders(rows: DiaryDockRecordRow[]): Reminder[] {
  return rows.map((row) => ({
    id: String(row.id), title: String(row.title),
    note: row.note ? String(row.note) : undefined,
    roomId: row.room_id ? String(row.room_id) : undefined,
    roomName: row.room_name ? String(row.room_name) : undefined,
    group: reminderGroup(row.reminder_group), timeLabel: String(row.time_label),
    priority: reminderPriority(row.priority),
    repeat: row.repeat ? String(row.repeat) : undefined,
    documentId: row.document_id ? String(row.document_id) : undefined,
    documentTitle: row.document_title ? String(row.document_title) : undefined,
    assignedTo: row.assigned_to ? String(row.assigned_to) : undefined,
    dueAt: row.due_at ? String(row.due_at) : undefined,
    sourceDueAt: row.source_due_at ? String(row.source_due_at) : undefined,
    origin: row.origin === "SYSTEM_GENERATED" ? "SYSTEM_GENERATED" : "USER_CREATED",
    reminderType: row.reminder_type ? String(row.reminder_type) : undefined,
    sourceResourceType: row.source_resource_type ? String(row.source_resource_type) : undefined,
    sourceResourceId: row.source_resource_id ? String(row.source_resource_id) : undefined,
    sourceDateKey: row.source_date_key ? String(row.source_date_key) : undefined,
    ruleId: row.rule_id ? String(row.rule_id) : undefined,
    ruleVersion: typeof row.rule_version === "number" ? row.rule_version : undefined,
    dedupeKey: row.dedupe_key ? String(row.dedupe_key) : undefined,
    scheduleOffsetDays: typeof row.schedule_offset_days === "number"
      ? row.schedule_offset_days : undefined,
    timeZone: row.time_zone ? String(row.time_zone) : undefined,
  }));
}
