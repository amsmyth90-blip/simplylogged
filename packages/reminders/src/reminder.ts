import type { JsonObject } from "@diarydock/contracts";
import type { LocalRecord, LocalSyncState } from "@diarydock/offline-store";

export type ReminderGroup = "done" | "later" | "today" | "week";
export type ReminderPriority = "high" | "low" | "medium" | "normal";

export type Reminder = {
  id: string;
  title: string;
  note?: string;
  roomId?: string;
  roomName?: string;
  group: ReminderGroup;
  timeLabel: string;
  priority: ReminderPriority;
  repeat?: string;
  documentId?: string;
  documentTitle?: string;
  assignedTo?: string;
  dueAt?: string;
  sourceDueAt?: string;
  timeZone: string;
  origin: "SYSTEM_GENERATED" | "USER_CREATED";
  reminderType: string;
  sourceResourceType?: string;
  sourceResourceId?: string;
  sourceDateKey?: string;
  ruleId?: string;
  ruleVersion?: number;
  dedupeKey?: string;
  scheduleOffsetDays?: number;
  revision: string;
  syncState: LocalSyncState;
};

export type EditableReminder = Pick<
  Reminder,
  | "assignedTo"
  | "documentId"
  | "documentTitle"
  | "dueAt"
  | "group"
  | "note"
  | "priority"
  | "repeat"
  | "roomId"
  | "roomName"
  | "timeLabel"
  | "timeZone"
  | "title"
>;

function requiredText(payload: JsonObject, key: string, maximum: number) {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`Reminder ${key} is invalid.`);
  }
  return value;
}

function optionalText(payload: JsonObject, key: string, maximum: number) {
  const value = payload[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) {
    throw new Error(`Reminder ${key} is invalid.`);
  }
  return value || undefined;
}

function group(value: string): ReminderGroup {
  if (value === "done" || value === "later" || value === "today" || value === "week") return value;
  throw new Error("Reminder group is invalid.");
}

function priority(value: string): ReminderPriority {
  if (value === "high" || value === "low" || value === "medium" || value === "normal") return value;
  throw new Error("Reminder priority is invalid.");
}

function origin(payload: JsonObject): Reminder["origin"] {
  if (payload.origin === "SYSTEM_GENERATED" || payload.origin === "USER_CREATED") {
    return payload.origin;
  }
  throw new Error("Reminder origin is invalid.");
}

function timeZone(payload: JsonObject) {
  const value = optionalText(payload, "timeZone", 64) ?? "Europe/London";
  if (!/^[A-Za-z_+.-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(value)) {
    throw new Error("Reminder time zone is invalid.");
  }
  return value;
}

function dueAt(payload: JsonObject) {
  const value = optionalText(payload, "dueAt", 32);
  if (value && Number.isNaN(new Date(value).valueOf())) {
    throw new Error("Reminder due date is invalid.");
  }
  return value;
}

function optionalInteger(payload: JsonObject, key: string) {
  const value = payload[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Reminder ${key} is invalid.`);
  }
  return value;
}

export function parseReminder(record: LocalRecord): Reminder {
  if (record.entityType !== "reminder") throw new Error("The record is not a reminder.");
  const payload = record.payload;
  return {
    id: record.id,
    title: requiredText(payload, "title", 240),
    note: optionalText(payload, "note", 1_000),
    roomId: optionalText(payload, "roomId", 128),
    roomName: optionalText(payload, "roomName", 160),
    group: group(requiredText(payload, "group", 16)),
    timeLabel: requiredText(payload, "timeLabel", 120),
    priority: priority(requiredText(payload, "priority", 16)),
    repeat: optionalText(payload, "repeat", 120),
    documentId: optionalText(payload, "documentId", 128),
    documentTitle: optionalText(payload, "documentTitle", 240),
    assignedTo: optionalText(payload, "assignedTo", 160),
    dueAt: dueAt(payload),
    sourceDueAt: optionalText(payload, "sourceDueAt", 32),
    timeZone: timeZone(payload),
    origin: origin(payload),
    reminderType: optionalText(payload, "reminderType", 64) ?? "custom",
    sourceResourceType: optionalText(payload, "sourceResourceType", 64),
    sourceResourceId: optionalText(payload, "sourceResourceId", 128),
    sourceDateKey: optionalText(payload, "sourceDateKey", 64),
    ruleId: optionalText(payload, "ruleId", 128),
    ruleVersion: optionalInteger(payload, "ruleVersion"),
    dedupeKey: optionalText(payload, "dedupeKey", 240),
    scheduleOffsetDays: optionalInteger(payload, "scheduleOffsetDays"),
    revision: record.revision,
    syncState: record.syncState,
  };
}

function put(payload: JsonObject, key: string, value: string | undefined) {
  if (value) payload[key] = value;
}

export function reminderPayload(reminder: EditableReminder): JsonObject {
  const payload: JsonObject = {
    title: reminder.title.trim(),
    group: reminder.group,
    timeLabel: reminder.timeLabel,
    priority: reminder.priority,
    origin: "USER_CREATED",
    reminderType: "custom",
    timeZone: reminder.timeZone,
  };
  put(payload, "note", reminder.note);
  put(payload, "roomId", reminder.roomId);
  put(payload, "roomName", reminder.roomName);
  put(payload, "repeat", reminder.repeat);
  put(payload, "documentId", reminder.documentId);
  put(payload, "documentTitle", reminder.documentTitle);
  put(payload, "assignedTo", reminder.assignedTo);
  put(payload, "dueAt", reminder.dueAt);
  requiredText(payload, "title", 240);
  group(requiredText(payload, "group", 16));
  requiredText(payload, "timeLabel", 120);
  priority(requiredText(payload, "priority", 16));
  dueAt(payload);
  timeZone(payload);
  return payload;
}

function putValue(payload: JsonObject, key: string, value: string | number | undefined) {
  if (value !== undefined) payload[key] = value;
}

export function systemReminderCompletionPayload(reminder: Reminder, completed: boolean): JsonObject {
  if (reminder.origin !== "SYSTEM_GENERATED") {
    throw new Error("Only a system reminder can use a system completion action.");
  }
  const payload: JsonObject = {
    title: reminder.title,
    group: completed ? "done" : "today",
    timeLabel: completed ? "Completed" : "Today",
    priority: reminder.priority,
    origin: "SYSTEM_GENERATED",
    reminderType: reminder.reminderType,
    timeZone: reminder.timeZone,
  };
  putValue(payload, "note", reminder.note);
  putValue(payload, "roomId", reminder.roomId);
  putValue(payload, "roomName", reminder.roomName);
  putValue(payload, "repeat", reminder.repeat);
  putValue(payload, "documentId", reminder.documentId);
  putValue(payload, "documentTitle", reminder.documentTitle);
  putValue(payload, "assignedTo", reminder.assignedTo);
  putValue(payload, "dueAt", reminder.dueAt);
  putValue(payload, "sourceDueAt", reminder.sourceDueAt);
  putValue(payload, "sourceResourceType", reminder.sourceResourceType);
  putValue(payload, "sourceResourceId", reminder.sourceResourceId);
  putValue(payload, "sourceDateKey", reminder.sourceDateKey);
  putValue(payload, "ruleId", reminder.ruleId);
  putValue(payload, "ruleVersion", reminder.ruleVersion);
  putValue(payload, "dedupeKey", reminder.dedupeKey);
  putValue(payload, "scheduleOffsetDays", reminder.scheduleOffsetDays);
  return payload;
}
