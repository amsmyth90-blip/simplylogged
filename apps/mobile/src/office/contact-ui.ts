import type { OfficeContact, SaveOfficeContact } from "@diarydock/office";

export function emptyOfficeContact(): SaveOfficeContact {
  return {
    firstName: "",
    lastName: "",
    role: "",
    company: "",
    category: "Other",
    phone: "",
    email: "",
    address: "",
    notes: "",
    isFavourite: false,
    isEmergencyContact: false,
    nextReviewDate: "",
    linkedDocumentIds: [],
    linkedPolicyIds: [],
    linkedContractIds: [],
    linkedBillIds: [],
    contactNotes: [],
    meetings: [],
  };
}

export function editableOfficeContact(contact: OfficeContact | null): SaveOfficeContact {
  if (!contact) return emptyOfficeContact();
  const { contentComplete, id, createdAt, updatedAt, ...fields } = contact;
  void contentComplete;
  void id;
  void createdAt;
  void updatedAt;
  return fields;
}

export function officeContactName(contact: Pick<OfficeContact, "firstName" | "lastName" | "company">) {
  return `${contact.firstName} ${contact.lastName}`.trim() || contact.company || "Unnamed contact";
}

export function officeContactInitials(
  contact: Pick<OfficeContact, "firstName" | "lastName" | "company">,
) {
  return (`${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`
    || contact.company.slice(0, 2) || "PC").toUpperCase();
}

export function meetingTime(date: string, time: string) {
  const value = Date.parse(`${date}T${time || "12:00"}:00`);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}
