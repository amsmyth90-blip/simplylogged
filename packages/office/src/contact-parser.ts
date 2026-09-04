import {
  OFFICE_CONTACT_DETAIL_SCHEMA_VERSION,
  OFFICE_CONTACTS_SCHEMA_VERSION,
  officeContactCategories,
  type OfficeContact,
  type OfficeContactDetail,
  type OfficeContactDetailRequest,
  type OfficeContactMeeting,
  type OfficeContactNote,
  type OfficeContactsSnapshot,
  type SaveOfficeContact,
} from "./contact-types.ts";
import {
  boolean,
  date,
  exact,
  list,
  optionalText,
  record,
  text,
} from "./validation.ts";

function category(value: unknown) {
  if (!officeContactCategories.includes(value as never)) {
    throw new Error("Contact category is invalid.");
  }
  return value as SaveOfficeContact["category"];
}

function identifier(value: unknown, label: string) {
  return text(value, label, 128);
}

function identifiers(value: unknown, label: string) {
  const entries = list(value, label, 64).map((entry) => identifier(entry, label));
  if (new Set(entries).size !== entries.length) throw new Error(`${label} is invalid.`);
  return entries;
}

function note(value: unknown): OfficeContactNote {
  const item = record(value, "Contact note");
  exact(item, ["id", "note", "createdAt"], "Contact note");
  return {
    id: identifier(item.id, "Contact note ID"),
    note: text(item.note, "Contact note", 2_000),
    createdAt: text(item.createdAt, "Contact note time", 40),
  };
}

function time(value: unknown) {
  const parsed = text(value, "Meeting time", 5, true);
  if (parsed && !/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed)) {
    throw new Error("Meeting time is invalid.");
  }
  return parsed;
}

function meeting(value: unknown): OfficeContactMeeting {
  const item = record(value, "Contact meeting");
  exact(item, ["id", "title", "date", "time", "notes", "completed", "createdAt"],
    "Contact meeting");
  return {
    id: identifier(item.id, "Meeting ID"),
    title: text(item.title, "Meeting title", 240),
    date: date(item.date, "Meeting date", false),
    time: time(item.time),
    notes: text(item.notes, "Meeting notes", 2_000, true),
    completed: boolean(item.completed, "Meeting completion"),
    createdAt: text(item.createdAt, "Meeting creation time", 40),
  };
}

export function parseSaveOfficeContact(value: unknown): SaveOfficeContact {
  const item = record(value, "Professional contact");
  exact(item, ["firstName", "lastName", "role", "company", "category", "phone", "email",
    "address", "notes", "isFavourite", "isEmergencyContact", "nextReviewDate",
    "linkedDocumentIds", "linkedPolicyIds", "linkedContractIds", "linkedBillIds",
    "contactNotes", "meetings"], "Professional contact");
  const firstName = text(item.firstName, "First name", 120, true);
  const lastName = text(item.lastName, "Last name", 120, true);
  const company = text(item.company, "Company", 200, true);
  if (!firstName && !lastName && !company) throw new Error("Add a name or company.");
  return {
    firstName,
    lastName,
    role: text(item.role, "Role", 160, true),
    company,
    category: category(item.category),
    phone: text(item.phone, "Phone", 80, true),
    email: text(item.email, "Email", 254, true),
    address: text(item.address, "Address", 1_000, true),
    notes: text(item.notes, "Notes", 4_000, true),
    isFavourite: boolean(item.isFavourite, "Favourite"),
    isEmergencyContact: boolean(item.isEmergencyContact, "Key contact"),
    nextReviewDate: date(item.nextReviewDate, "Next review date"),
    linkedDocumentIds: identifiers(item.linkedDocumentIds, "Linked document IDs"),
    linkedPolicyIds: identifiers(item.linkedPolicyIds, "Linked policy IDs"),
    linkedContractIds: identifiers(item.linkedContractIds, "Linked contract IDs"),
    linkedBillIds: identifiers(item.linkedBillIds, "Linked bill IDs"),
    contactNotes: list(item.contactNotes, "Contact notes", 100).map(note),
    meetings: list(item.meetings, "Contact meetings", 100).map(meeting),
  };
}

export function parseOfficeContactRecord(value: unknown): OfficeContact {
  const item = record(value, "Professional contact record");
  exact(item, ["contentComplete", "id", "createdAt", "updatedAt", "firstName", "lastName", "role", "company",
    "category", "phone", "email", "address", "notes", "isFavourite",
    "isEmergencyContact", "nextReviewDate", "linkedDocumentIds", "linkedPolicyIds",
    "linkedContractIds", "linkedBillIds", "contactNotes", "meetings"],
  "Professional contact record");
  return {
    contentComplete: boolean(item.contentComplete, "Contact completeness"),
    id: identifier(item.id, "Contact ID"),
    createdAt: text(item.createdAt, "Contact creation time", 40),
    updatedAt: text(item.updatedAt, "Contact update time", 40),
    ...parseSaveOfficeContact({
      firstName: item.firstName,
      lastName: item.lastName,
      role: item.role,
      company: item.company,
      category: item.category,
      phone: item.phone,
      email: item.email,
      address: item.address,
      notes: item.notes,
      isFavourite: item.isFavourite,
      isEmergencyContact: item.isEmergencyContact,
      nextReviewDate: item.nextReviewDate,
      linkedDocumentIds: item.linkedDocumentIds,
      linkedPolicyIds: item.linkedPolicyIds,
      linkedContractIds: item.linkedContractIds,
      linkedBillIds: item.linkedBillIds,
      contactNotes: item.contactNotes,
      meetings: item.meetings,
    }),
  };
}

export function parseOfficeContactsSnapshot(value: unknown): OfficeContactsSnapshot {
  const snapshot = record(value, "Office contacts snapshot");
  exact(snapshot, ["schemaVersion", "revision", "contacts"], "Office contacts snapshot");
  if (snapshot.schemaVersion !== OFFICE_CONTACTS_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Office contacts.");
  }
  return {
    schemaVersion: OFFICE_CONTACTS_SCHEMA_VERSION,
    revision: optionalText(snapshot.revision, "Office revision", 40),
    contacts: list(snapshot.contacts, "Office contacts", 300).map(parseOfficeContactRecord),
  };
}

export function parseOfficeContactDetailRequest(value: unknown): OfficeContactDetailRequest {
  const item = record(value, "Office contact detail request");
  exact(item, ["contactId"], "Office contact detail request");
  return { contactId: identifier(item.contactId, "Contact ID") };
}

export function parseOfficeContactDetail(value: unknown): OfficeContactDetail {
  const item = record(value, "Office contact detail");
  exact(item, ["schemaVersion", "contact"], "Office contact detail");
  if (item.schemaVersion !== OFFICE_CONTACT_DETAIL_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this contact.");
  }
  const contact = parseOfficeContactRecord(item.contact);
  if (!contact.contentComplete) throw new Error("Office contact detail is incomplete.");
  return { schemaVersion: OFFICE_CONTACT_DETAIL_SCHEMA_VERSION, contact };
}
