import type {
  OfficeContactsMutation,
  SaveOfficeContact,
} from "@diarydock/office";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
type StoredOfficeContact = SaveOfficeContact & {
  id: string;
  createdAt: string;
  updatedAt: string;
} & JsonRecord;
type MutationResult =
  | { status: "OK"; payload: JsonRecord }
  | { status: "CAPACITY" | "NOT_FOUND"; payload: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function dedupeKey(contact: SaveOfficeContact) {
  const name = `${contact.firstName} ${contact.lastName}`.trim().toLowerCase();
  return `${contact.email.trim().toLowerCase()}|${name}|${contact.company.trim().toLowerCase()}`;
}

function storedDedupeKey(value: unknown) {
  const contact = object(value);
  const name = `${String(contact.firstName ?? "")} ${String(contact.lastName ?? "")}`
    .trim().toLowerCase();
  return `${String(contact.email ?? "").trim().toLowerCase()}|${name}|${String(
    contact.company ?? "",
  ).trim().toLowerCase()}`;
}

function savedContact(
  contact: SaveOfficeContact,
  previous: JsonRecord,
  id: string,
  now: string,
): StoredOfficeContact {
  return {
    ...previous,
    ...contact,
    id,
    createdAt: typeof previous.createdAt === "string" ? previous.createdAt : now,
    updatedAt: now,
  };
}

function withinCapacity(payload: JsonRecord) {
  return jsonUtf8Bytes(payload) <= 1_900_000;
}

export function mutateOfficeContactsPayload(
  current: unknown,
  mutation: OfficeContactsMutation,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): MutationResult {
  const payload = structuredClone(object(current));
  const collection = object(payload.professionalContacts);
  const records = Array.isArray(collection.contacts) ? [...collection.contacts] : [];

  if (mutation.operation === "DELETE_CONTACT") {
    const index = records.findIndex((entry) => object(entry).id === mutation.contactId);
    if (index < 0) return { status: "NOT_FOUND", payload: null };
    records.splice(index, 1);
  } else if (mutation.operation === "SAVE_CONTACT") {
    const index = mutation.contactId
      ? records.findIndex((entry) => object(entry).id === mutation.contactId)
      : -1;
    if (mutation.contactId && index < 0) return { status: "NOT_FOUND", payload: null };
    if (!mutation.contactId && records.length >= 300) {
      return { status: "CAPACITY", payload: null };
    }
    const previous = index >= 0 ? object(records[index]) : {};
    const saved = savedContact(
      mutation.contact,
      previous,
      mutation.contactId ?? createId(),
      now,
    );
    if (index >= 0) records[index] = saved;
    else records.unshift(saved);
  } else {
    const keys = new Set(records.map(storedDedupeKey));
    const additions: StoredOfficeContact[] = [];
    for (const contact of mutation.contacts) {
      const key = dedupeKey(contact);
      if (keys.has(key)) continue;
      keys.add(key);
      additions.push(savedContact(contact, {}, createId(), now));
    }
    if (records.length + additions.length > 300) {
      return { status: "CAPACITY", payload: null };
    }
    records.unshift(...additions);
  }

  payload.professionalContacts = { ...collection, contacts: records };
  return withinCapacity(payload)
    ? { status: "OK", payload }
    : { status: "CAPACITY", payload: null };
}
