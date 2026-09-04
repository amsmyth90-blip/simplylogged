import {
  OFFICE_CONTACT_DETAIL_SCHEMA_VERSION,
  OFFICE_CONTACTS_SCHEMA_VERSION,
  officeContactCategories,
  parseOfficeContactDetail,
  parseOfficeContactsSnapshot,
  type OfficeContact,
  type OfficeContactMeeting,
  type OfficeContactNote,
  type OfficeContactsSnapshot,
} from "@diarydock/office";

import { jsonUtf8Bytes, utf8Text } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, characters: number, bytes = characters * 4) {
  return utf8Text(value, characters, bytes);
}

function date(value: unknown) {
  const candidate = text(value, 10, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

function identifiers(value: unknown) {
  return (Array.isArray(value) ? value : []).slice(0, 64)
    .map((entry) => text(entry, 128, 128)).filter(Boolean);
}

function note(value: unknown): OfficeContactNote | null {
  const item = object(value);
  const id = text(item.id, 128, 128);
  const content = text(item.note, 2_000, 2_000);
  if (!id || !content) return null;
  return {
    id,
    note: content,
    createdAt: text(item.createdAt, 40, 40) || new Date(0).toISOString(),
  };
}

function meeting(value: unknown): OfficeContactMeeting | null {
  const item = object(value);
  const id = text(item.id, 128, 128);
  const title = text(item.title, 240, 240);
  const meetingDate = date(item.date);
  if (!id || !title || !meetingDate) return null;
  const meetingTime = text(item.time, 5, 5);
  return {
    id,
    title,
    date: meetingDate,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(meetingTime) ? meetingTime : "",
    notes: text(item.notes, 2_000, 2_000),
    completed: item.completed === true,
    createdAt: text(item.createdAt, 40, 40) || new Date(0).toISOString(),
  };
}

export function projectOfficeContact(value: unknown): OfficeContact | null {
  const item = object(value);
  const id = text(item.id, 128, 128);
  const firstName = text(item.firstName, 120, 64);
  const lastName = text(item.lastName, 120, 64);
  const company = text(item.company, 200, 120);
  if (!id || (!firstName && !lastName && !company)) return null;
  return {
    contentComplete: true,
    id,
    firstName,
    lastName,
    role: text(item.role, 160, 96),
    company,
    category: officeContactCategories.includes(item.category as never)
      ? item.category as OfficeContact["category"] : "Other",
    phone: text(item.phone, 80, 64),
    email: text(item.email, 254, 160),
    address: text(item.address, 1_000, 1_000),
    notes: text(item.notes, 4_000, 4_000),
    isFavourite: item.isFavourite === true,
    isEmergencyContact: item.isEmergencyContact === true,
    nextReviewDate: date(item.nextReviewDate),
    linkedDocumentIds: identifiers(item.linkedDocumentIds),
    linkedPolicyIds: identifiers(item.linkedPolicyIds),
    linkedContractIds: identifiers(item.linkedContractIds),
    linkedBillIds: identifiers(item.linkedBillIds),
    contactNotes: (Array.isArray(item.contactNotes) ? item.contactNotes : [])
      .slice(0, 100).map(note).filter((entry): entry is OfficeContactNote => Boolean(entry)),
    meetings: (Array.isArray(item.meetings) ? item.meetings : [])
      .slice(0, 100).map(meeting)
      .filter((entry): entry is OfficeContactMeeting => Boolean(entry)),
    createdAt: text(item.createdAt, 40, 40) || new Date(0).toISOString(),
    updatedAt: text(item.updatedAt, 40, 40) || new Date(0).toISOString(),
  };
}

function addValue<T>(target: T[], value: T | undefined, size: { value: number }) {
  if (value === undefined) return false;
  const delta = jsonUtf8Bytes(value) + (target.length ? 1 : 0);
  if (size.value + delta > SNAPSHOT_LIMIT) return false;
  target.push(value);
  size.value += delta;
  return true;
}

function addText(target: OfficeContact, key: "address" | "notes", source: string,
  round: number, size: { value: number }) {
  const chunk = source.slice(round * 64, (round + 1) * 64);
  if (!chunk) return false;
  const delta = jsonUtf8Bytes(target[key] + chunk) - jsonUtf8Bytes(target[key]);
  if (size.value + delta > SNAPSHOT_LIMIT) return false;
  target[key] += chunk;
  size.value += delta;
  return true;
}

function fit(records: OfficeContact[], revision: string | null) {
  const fitted = records.map((item) => ({
    ...item,
    contentComplete: false,
    address: "",
    notes: "",
    linkedDocumentIds: [] as string[],
    linkedPolicyIds: [] as string[],
    linkedContractIds: [] as string[],
    linkedBillIds: [] as string[],
    contactNotes: [] as OfficeContactNote[],
    meetings: [] as OfficeContactMeeting[],
  }));
  const size = { value: jsonUtf8Bytes({
    schemaVersion: OFFICE_CONTACTS_SCHEMA_VERSION, revision, contacts: fitted,
  }) };
  if (size.value > SNAPSHOT_LIMIT) {
    throw new Error("Office contacts exceed the safe mobile record limit.");
  }
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (let index = 0; index < records.length; index += 1) {
      added = addText(fitted[index]!, "address", records[index]!.address, round, size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addText(fitted[index]!, "notes", records[index]!.notes, round, size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addValue(fitted[index]!.contactNotes, records[index]!.contactNotes[round], size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addValue(fitted[index]!.meetings, records[index]!.meetings[round], size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addValue(fitted[index]!.linkedDocumentIds,
        records[index]!.linkedDocumentIds[round], size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addValue(fitted[index]!.linkedPolicyIds,
        records[index]!.linkedPolicyIds[round], size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addValue(fitted[index]!.linkedContractIds,
        records[index]!.linkedContractIds[round], size) || added;
    }
    for (let index = 0; index < records.length; index += 1) {
      added = addValue(fitted[index]!.linkedBillIds,
        records[index]!.linkedBillIds[round], size) || added;
    }
    round += 1;
  }
  for (let index = 0; index < records.length; index += 1) {
    const source = records[index]!; const item = fitted[index]!;
    item.contentComplete = item.address === source.address && item.notes === source.notes
      && item.contactNotes.length === source.contactNotes.length
      && item.meetings.length === source.meetings.length
      && item.linkedDocumentIds.length === source.linkedDocumentIds.length
      && item.linkedPolicyIds.length === source.linkedPolicyIds.length
      && item.linkedContractIds.length === source.linkedContractIds.length
      && item.linkedBillIds.length === source.linkedBillIds.length;
  }
  return fitted;
}

export function projectOfficeContactsSnapshot(
  payload: unknown,
  revision: string | null,
): OfficeContactsSnapshot {
  const root = object(payload);
  const collection = object(root.professionalContacts);
  const contacts = (Array.isArray(collection.contacts) ? collection.contacts : [])
    .slice(0, 300).map(projectOfficeContact)
    .filter((entry): entry is OfficeContact => Boolean(entry));
  return parseOfficeContactsSnapshot({
    schemaVersion: OFFICE_CONTACTS_SCHEMA_VERSION,
    revision,
    contacts: fit(contacts, revision),
  });
}

export function projectOfficeContactDetail(payload: unknown, contactId: string) {
  const collection = object(object(payload).professionalContacts);
  const value = (Array.isArray(collection.contacts) ? collection.contacts : [])
    .slice(0, 300).find((entry) => text(object(entry).id, 128, 128) === contactId);
  const projected = projectOfficeContact(value);
  if (!projected) return null;
  return parseOfficeContactDetail({ schemaVersion: OFFICE_CONTACT_DETAIL_SCHEMA_VERSION,
    contact: projected });
}

export { mutateOfficeContactsPayload } from "./mobile-contacts-mutation.ts";
