export const OFFICE_CONTACTS_SCHEMA_VERSION = 1;
export const OFFICE_CONTACT_DETAIL_SCHEMA_VERSION = 1;

export const officeContactCategories = [
  "Legal",
  "Financial",
  "Insurance",
  "Property",
  "Utilities",
  "Healthcare",
  "Family & school",
  "Other",
] as const;

export type OfficeContactCategory = (typeof officeContactCategories)[number];

export type OfficeContactNote = {
  id: string;
  note: string;
  createdAt: string;
};

export type OfficeContactMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  completed: boolean;
  createdAt: string;
};

export type SaveOfficeContact = {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  category: OfficeContactCategory;
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
  contactNotes: OfficeContactNote[];
  meetings: OfficeContactMeeting[];
};

export type OfficeContact = SaveOfficeContact & {
  contentComplete: boolean;
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type OfficeContactDetailRequest = { contactId: string };
export type OfficeContactDetail = {
  schemaVersion: typeof OFFICE_CONTACT_DETAIL_SCHEMA_VERSION;
  contact: OfficeContact;
};

export type OfficeContactsSnapshot = {
  schemaVersion: typeof OFFICE_CONTACTS_SCHEMA_VERSION;
  revision: string | null;
  contacts: OfficeContact[];
};

export type OfficeContactsMutation =
  | {
      operation: "SAVE_CONTACT";
      revision: string | null;
      contactId: string | null;
      contact: SaveOfficeContact;
    }
  | {
      operation: "DELETE_CONTACT";
      revision: string | null;
      contactId: string;
    }
  | {
      operation: "IMPORT_CONTACTS";
      revision: string | null;
      contacts: SaveOfficeContact[];
    };
