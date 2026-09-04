import {
  OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION,
  OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
  officeCorrespondenceFolders,
  officeCorrespondenceStatuses,
  parseOfficeCorrespondenceDetail,
  parseOfficeCorrespondenceSnapshot,
  type OfficeCorrespondence,
  type OfficeCorrespondenceAction,
  type OfficeCorrespondenceResponse,
  type OfficeCorrespondenceSnapshot,
} from "@diarydock/office";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.slice(0, maximum).trim() : "";
}

function date(value: unknown) {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

function optionalId(value: unknown) {
  return text(value, 128) || null;
}

function action(value: unknown): OfficeCorrespondenceAction | null {
  const item = object(value);
  const id = text(item.id, 128);
  const label = text(item.label, 240);
  return id && label ? { id, label, completed: item.completed === true } : null;
}

function response(value: unknown): OfficeCorrespondenceResponse | null {
  const item = object(value);
  const id = text(item.id, 128);
  const note = text(item.note, 2_000);
  if (!id || !note) return null;
  return { id, note, createdAt: text(item.createdAt, 40) || new Date(0).toISOString() };
}

function safeUrl(value: unknown) {
  const candidate = text(value, 512);
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

export function projectOfficeCorrespondence(value: unknown): OfficeCorrespondence | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 160);
  const sender = text(item.sender, 160);
  if (!id || (!title && !sender)) return null;
  return {
    contentComplete: true,
    id,
    documentId: optionalId(item.documentId),
    title: title || `${sender} correspondence`,
    sender,
    correspondenceType: text(item.correspondenceType, 120),
    folder: officeCorrespondenceFolders.includes(item.folder as never)
      ? item.folder as OfficeCorrespondence["folder"] : "Other",
    receivedDate: date(item.receivedDate),
    deadline: date(item.deadline),
    status: officeCorrespondenceStatuses.includes(item.status as never)
      ? item.status as OfficeCorrespondence["status"] : "unread",
    reviewStatus: item.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
    summary: text(item.summary, 4_000),
    actions: (Array.isArray(item.actions) ? item.actions : []).slice(0, 24)
      .map(action).filter((entry): entry is OfficeCorrespondenceAction => Boolean(entry)),
    contactName: text(item.contactName, 160),
    contactPhone: text(item.contactPhone, 80),
    contactUrl: safeUrl(item.contactUrl),
    linkedReminderIds: (Array.isArray(item.linkedReminderIds) ? item.linkedReminderIds : [])
      .slice(0, 24).map((entry) => text(entry, 128)).filter(Boolean),
    linkedBillId: optionalId(item.linkedBillId),
    linkedPolicyId: optionalId(item.linkedPolicyId),
    responses: (Array.isArray(item.responses) ? item.responses : []).slice(-100)
      .map(response).filter((entry): entry is OfficeCorrespondenceResponse => Boolean(entry)),
    updatedAt: text(item.updatedAt, 40) || new Date(0).toISOString(),
  };
}

function fit(records: OfficeCorrespondence[], revision: string | null) {
  const fitted = records.map((item) => ({
    ...item, contentComplete: false, summary: "", actions: [] as OfficeCorrespondenceAction[],
    linkedReminderIds: [] as string[], responses: [] as OfficeCorrespondenceResponse[],
  }));
  let size = jsonUtf8Bytes({
    schemaVersion: OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
    revision,
    correspondence: fitted,
  });
  if (size > SNAPSHOT_LIMIT) {
    throw new Error("Office correspondence exceeds the safe mobile record limit.");
  }
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (let index = 0; index < records.length; index += 1) {
      const source = records[index]!;
      const target = fitted[index]!;
      const chunk = source.summary.slice(round * 64, (round + 1) * 64);
      const summaryDelta = jsonUtf8Bytes(target.summary + chunk) - jsonUtf8Bytes(target.summary);
      if (chunk && size + summaryDelta <= SNAPSHOT_LIMIT) {
        target.summary += chunk; size += summaryDelta; added = true;
      }
    }
    for (let index = 0; index < records.length; index += 1) {
      const source = records[index]!;
      const target = fitted[index]!;
      const actionEntry = source.actions[round];
      const actionDelta = actionEntry
        ? jsonUtf8Bytes(actionEntry) + (target.actions.length ? 1 : 0)
        : 0;
      if (actionEntry && size + actionDelta <= SNAPSHOT_LIMIT) {
        target.actions.push(actionEntry); size += actionDelta; added = true;
      }
    }
    for (let index = 0; index < records.length; index += 1) {
      const source = records[index]!;
      const target = fitted[index]!;
      const reminderId = source.linkedReminderIds[round];
      const reminderDelta = reminderId
        ? jsonUtf8Bytes(reminderId) + (target.linkedReminderIds.length ? 1 : 0)
        : 0;
      if (reminderId && size + reminderDelta <= SNAPSHOT_LIMIT) {
        target.linkedReminderIds.push(reminderId); size += reminderDelta; added = true;
      }
    }
    for (let index = 0; index < records.length; index += 1) {
      const source = records[index]!;
      const target = fitted[index]!;
      const responseEntry = source.responses[source.responses.length - 1 - round];
      const responseDelta = responseEntry
        ? jsonUtf8Bytes(responseEntry) + (target.responses.length ? 1 : 0)
        : 0;
      if (responseEntry && size + responseDelta <= SNAPSHOT_LIMIT) {
        target.responses.unshift(responseEntry); size += responseDelta; added = true;
      }
    }
    round += 1;
  }
  for (let index = 0; index < records.length; index += 1) {
    const source = records[index]!; const item = fitted[index]!;
    item.contentComplete = item.summary === source.summary
      && item.actions.length === source.actions.length
      && item.linkedReminderIds.length === source.linkedReminderIds.length
      && item.responses.length === source.responses.length;
  }
  return fitted;
}

export function projectOfficeCorrespondenceSnapshot(
  payload: unknown,
  revision: string | null,
): OfficeCorrespondenceSnapshot {
  const root = object(payload);
  const collection = object(root.correspondence);
  const records = (Array.isArray(collection.correspondence) ? collection.correspondence : [])
    .slice(0, 300).map(projectOfficeCorrespondence)
    .filter((entry): entry is OfficeCorrespondence => Boolean(entry));
  return parseOfficeCorrespondenceSnapshot({
    schemaVersion: OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
    revision,
    correspondence: fit(records, revision),
  });
}

export function projectOfficeCorrespondenceDetail(payload: unknown, correspondenceId: string) {
  const collection = object(object(payload).correspondence);
  const value = (Array.isArray(collection.correspondence) ? collection.correspondence : [])
    .slice(0, 300).find((entry) => text(object(entry).id, 128) === correspondenceId);
  const projected = projectOfficeCorrespondence(value);
  if (!projected) return null;
  return parseOfficeCorrespondenceDetail({
    schemaVersion: OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION,
    correspondence: projected,
  });
}

export { mutateOfficeCorrespondencePayload } from "./mobile-correspondence-mutation.ts";
