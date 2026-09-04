import {
  OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION,
  OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
  officeCorrespondenceFolders,
  officeCorrespondenceStatuses,
  type OfficeCorrespondence,
  type OfficeCorrespondenceDetail,
  type OfficeCorrespondenceDetailRequest,
  type OfficeCorrespondenceAction,
  type OfficeCorrespondenceResponse,
  type OfficeCorrespondenceSnapshot,
  type SaveOfficeCorrespondence,
} from "./correspondence-types.ts";
import {
  boolean,
  date,
  exact,
  list,
  optionalText,
  record,
  text,
} from "./validation.ts";

function member<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${label} is invalid.`);
  return value as T;
}

function action(value: unknown): OfficeCorrespondenceAction {
  const item = record(value, "Correspondence action");
  exact(item, ["id", "label", "completed"], "Correspondence action");
  return {
    id: text(item.id, "Action ID", 128),
    label: text(item.label, "Action", 240),
    completed: boolean(item.completed, "Action completion"),
  };
}

function response(value: unknown): OfficeCorrespondenceResponse {
  const item = record(value, "Correspondence response");
  exact(item, ["id", "note", "createdAt"], "Correspondence response");
  return {
    id: text(item.id, "Response ID", 128),
    note: text(item.note, "Response note", 2_000),
    createdAt: text(item.createdAt, "Response time", 40),
  };
}

function webUrl(value: unknown) {
  const candidate = text(value, "Official web address", 2_048, true);
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("Official web address is invalid.");
  }
}

export function parseSaveOfficeCorrespondence(value: unknown): SaveOfficeCorrespondence {
  const item = record(value, "Correspondence");
  exact(item, ["title", "sender", "correspondenceType", "folder", "receivedDate",
    "deadline", "status", "summary", "actions", "contactName", "contactPhone",
    "contactUrl", "linkedReminderIds", "linkedBillId", "linkedPolicyId", "responses"],
  "Correspondence");
  const title = text(item.title, "Correspondence title", 160, true);
  const sender = text(item.sender, "Sender", 160, true);
  if (!title && !sender) throw new Error("Add a correspondence title or sender.");
  return {
    title,
    sender,
    correspondenceType: text(item.correspondenceType, "Correspondence type", 120, true),
    folder: member(item.folder, officeCorrespondenceFolders, "Correspondence folder"),
    receivedDate: date(item.receivedDate, "Received date"),
    deadline: date(item.deadline, "Deadline"),
    status: member(item.status, officeCorrespondenceStatuses, "Correspondence status"),
    summary: text(item.summary, "Correspondence summary", 4_000, true),
    actions: list(item.actions, "Correspondence actions", 24).map(action),
    contactName: text(item.contactName, "Contact name", 160, true),
    contactPhone: text(item.contactPhone, "Contact phone", 80, true),
    contactUrl: webUrl(item.contactUrl),
    linkedReminderIds: list(item.linkedReminderIds, "Linked reminders", 24)
      .map((id) => text(id, "Reminder ID", 128)),
    linkedBillId: optionalText(item.linkedBillId, "Linked bill ID", 128),
    linkedPolicyId: optionalText(item.linkedPolicyId, "Linked policy ID", 128),
    responses: list(item.responses, "Correspondence responses", 100).map(response),
  };
}

export function parseOfficeCorrespondenceRecord(value: unknown): OfficeCorrespondence {
  const item = record(value, "Correspondence record");
  exact(item, ["contentComplete", "id", "documentId", "reviewStatus", "updatedAt", "title", "sender",
    "correspondenceType", "folder", "receivedDate", "deadline", "status", "summary",
    "actions", "contactName", "contactPhone", "contactUrl", "linkedReminderIds",
    "linkedBillId", "linkedPolicyId", "responses"], "Correspondence record");
  if (item.reviewStatus !== "needs-review" && item.reviewStatus !== "reviewed") {
    throw new Error("Correspondence review status is invalid.");
  }
  return {
    contentComplete: boolean(item.contentComplete, "Correspondence completeness"),
    id: text(item.id, "Correspondence ID", 128),
    documentId: optionalText(item.documentId, "Document ID", 128),
    ...parseSaveOfficeCorrespondence({
      title: item.title,
      sender: item.sender,
      correspondenceType: item.correspondenceType,
      folder: item.folder,
      receivedDate: item.receivedDate,
      deadline: item.deadline,
      status: item.status,
      summary: item.summary,
      actions: item.actions,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      contactUrl: item.contactUrl,
      linkedReminderIds: item.linkedReminderIds,
      linkedBillId: item.linkedBillId,
      linkedPolicyId: item.linkedPolicyId,
      responses: item.responses,
    }),
    reviewStatus: item.reviewStatus,
    updatedAt: text(item.updatedAt, "Correspondence update time", 40),
  };
}

export function parseOfficeCorrespondenceSnapshot(value: unknown): OfficeCorrespondenceSnapshot {
  const snapshot = record(value, "Office correspondence snapshot");
  exact(snapshot, ["schemaVersion", "revision", "correspondence"], "Office correspondence snapshot");
  if (snapshot.schemaVersion !== OFFICE_CORRESPONDENCE_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Office correspondence.");
  }
  return {
    schemaVersion: OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
    revision: optionalText(snapshot.revision, "Office revision", 40),
    correspondence: list(snapshot.correspondence, "Office correspondence", 300)
      .map(parseOfficeCorrespondenceRecord),
  };
}

export function parseOfficeCorrespondenceDetailRequest(
  value: unknown,
): OfficeCorrespondenceDetailRequest {
  const item = record(value, "Office correspondence detail request");
  exact(item, ["correspondenceId"], "Office correspondence detail request");
  return { correspondenceId: text(item.correspondenceId, "Correspondence ID", 128) };
}

export function parseOfficeCorrespondenceDetail(value: unknown): OfficeCorrespondenceDetail {
  const item = record(value, "Office correspondence detail");
  exact(item, ["schemaVersion", "correspondence"], "Office correspondence detail");
  if (item.schemaVersion !== OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this correspondence.");
  }
  const correspondence = parseOfficeCorrespondenceRecord(item.correspondence);
  if (!correspondence.contentComplete) {
    throw new Error("Office correspondence detail is incomplete.");
  }
  return { schemaVersion: OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION, correspondence };
}
