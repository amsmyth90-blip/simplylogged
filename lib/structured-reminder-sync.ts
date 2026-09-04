import {
  SYNC_API_VERSION,
  parseSyncPushRequest,
  parseSyncRecord,
  type JsonObject,
  type SyncPushRequest,
  type SyncRecord,
} from "@diarydock/contracts";
import {
  parseReminder,
  reminderPayload,
  systemReminderCompletionPayload,
} from "@diarydock/reminders";

import type { Reminder } from "@/lib/mock-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReminderSyncRow = {
  deleted_at: string | null;
  entity_type: string;
  payload: unknown;
  record_id: string;
  revision: number | string;
  schema_version: number;
  scope_id: string;
  scope_kind: string;
  updated_at: string;
};

function timestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("The reminder version is invalid.");
  return date.toISOString();
}

export function parseReminderSyncRow(row: ReminderSyncRow): SyncRecord {
  return parseSyncRecord({
    id: row.record_id,
    entityType: row.entity_type,
    scope: { kind: row.scope_kind, id: row.scope_id },
    revision: String(row.revision),
    schemaVersion: row.schema_version,
    updatedAt: timestamp(row.updated_at),
    deletedAt: row.deleted_at ? timestamp(row.deleted_at) : null,
    payload: row.payload,
  });
}

function editablePayload(reminder: Reminder): JsonObject {
  return reminderPayload({
    assignedTo: reminder.assignedTo,
    documentId: reminder.documentId,
    documentTitle: reminder.documentTitle,
    dueAt: reminder.dueAt,
    group: reminder.group,
    note: reminder.note,
    priority: reminder.priority,
    repeat: reminder.repeat,
    roomId: reminder.roomId,
    roomName: reminder.roomName,
    timeLabel: reminder.timeLabel,
    timeZone: reminder.timeZone ?? "Europe/London",
    title: reminder.title,
  });
}

export function reminderMutationPayload(
  reminder: Reminder,
  current: SyncRecord | null,
): JsonObject {
  if (current?.deletedAt || current?.payload.origin !== "SYSTEM_GENERATED") {
    return editablePayload(reminder);
  }
  const parsed = parseReminder({ ...current, syncState: "CLEAN" });
  return systemReminderCompletionPayload(parsed, reminder.group === "done");
}

type RequestOptions = {
  current: SyncRecord | null;
  operation: "DELETE" | "UPSERT";
  reminder: Reminder;
};

export function createReminderSyncRequest(options: RequestOptions): SyncPushRequest {
  const recordId = options.current?.id ?? options.reminder.id;
  if (!uuidPattern.test(recordId)) {
    throw new Error("This reminder must be refreshed before it can be saved.");
  }
  const idempotencyKey = crypto.randomUUID();
  return parseSyncPushRequest({
    apiVersion: SYNC_API_VERSION,
    batchId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    mutations: [{
      entityType: "reminder",
      expectedRevision: options.current?.revision ?? null,
      idempotencyKey,
      operation: options.operation,
      payload: options.operation === "DELETE"
        ? {}
        : reminderMutationPayload(options.reminder, options.current),
      recordId,
      schemaVersion: 1,
    }],
  });
}
