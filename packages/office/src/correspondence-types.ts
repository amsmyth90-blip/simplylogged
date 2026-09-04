export const OFFICE_CORRESPONDENCE_SCHEMA_VERSION = 1;
export const OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION = 1;

export const officeCorrespondenceFolders = [
  "Banks & financial",
  "Insurance",
  "Government & HMRC",
  "Utilities",
  "Employers & pensions",
  "School & family",
  "Property",
  "Other",
] as const;

export const officeCorrespondenceStatuses = [
  "unread",
  "action-needed",
  "completed",
] as const;

export type OfficeCorrespondenceFolder = (typeof officeCorrespondenceFolders)[number];
export type OfficeCorrespondenceStatus = (typeof officeCorrespondenceStatuses)[number];

export type OfficeCorrespondenceAction = {
  id: string;
  label: string;
  completed: boolean;
};

export type OfficeCorrespondenceResponse = {
  id: string;
  note: string;
  createdAt: string;
};

export type SaveOfficeCorrespondence = {
  title: string;
  sender: string;
  correspondenceType: string;
  folder: OfficeCorrespondenceFolder;
  receivedDate: string;
  deadline: string;
  status: OfficeCorrespondenceStatus;
  summary: string;
  actions: OfficeCorrespondenceAction[];
  contactName: string;
  contactPhone: string;
  contactUrl: string;
  linkedReminderIds: string[];
  linkedBillId: string | null;
  linkedPolicyId: string | null;
  responses: OfficeCorrespondenceResponse[];
};

export type OfficeCorrespondence = SaveOfficeCorrespondence & {
  contentComplete: boolean;
  id: string;
  documentId: string | null;
  reviewStatus: "needs-review" | "reviewed";
  updatedAt: string;
};

export type OfficeCorrespondenceDetailRequest = { correspondenceId: string };
export type OfficeCorrespondenceDetail = {
  schemaVersion: typeof OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION;
  correspondence: OfficeCorrespondence;
};

export type OfficeCorrespondenceSnapshot = {
  schemaVersion: typeof OFFICE_CORRESPONDENCE_SCHEMA_VERSION;
  revision: string | null;
  correspondence: OfficeCorrespondence[];
};

export type OfficeCorrespondenceMutation = {
  operation: "SAVE_CORRESPONDENCE";
  revision: string | null;
  correspondenceId: string | null;
  correspondence: SaveOfficeCorrespondence;
};
