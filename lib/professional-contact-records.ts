export const professionalContactCategories = [
  "Legal",
  "Financial",
  "Insurance",
  "Property",
  "Utilities",
  "Healthcare",
  "Family & school",
  "Other",
] as const;

export type ProfessionalContactCategory =
  (typeof professionalContactCategories)[number];

export type ProfessionalContactNote = {
  id: string;
  note: string;
  createdAt: string;
};

export type ProfessionalContactMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  completed: boolean;
  createdAt: string;
};

export type ProfessionalContact = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  category: ProfessionalContactCategory;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isFavourite: boolean;
  isEmergencyContact: boolean;
  nextReviewDate: string;
  linkedDocumentIds: string[];
  linkedPolicyIds: string[];
  linkedContractIds: string[];
  linkedBillIds: string[];
  contactNotes: ProfessionalContactNote[];
  meetings: ProfessionalContactMeeting[];
  createdAt: string;
  updatedAt: string;
};

export type ProfessionalContactsRecord = { contacts: ProfessionalContact[] };

export function createInitialProfessionalContactsRecord(): ProfessionalContactsRecord {
  return { contacts: [] };
}

export function hydrateProfessionalContactsRecord(
  value?: Partial<ProfessionalContactsRecord>,
): ProfessionalContactsRecord {
  return {
    contacts: Array.isArray(value?.contacts)
      ? value.contacts.map((contact) => ({
          ...contact,
          linkedDocumentIds: Array.isArray(contact.linkedDocumentIds)
            ? contact.linkedDocumentIds
            : [],
          linkedPolicyIds: Array.isArray(contact.linkedPolicyIds)
            ? contact.linkedPolicyIds
            : [],
          linkedContractIds: Array.isArray(contact.linkedContractIds)
            ? contact.linkedContractIds
            : [],
          linkedBillIds: Array.isArray(contact.linkedBillIds)
            ? contact.linkedBillIds
            : [],
          contactNotes: Array.isArray(contact.contactNotes)
            ? contact.contactNotes
            : [],
          meetings: Array.isArray(contact.meetings) ? contact.meetings : [],
        }))
      : [],
  };
}
