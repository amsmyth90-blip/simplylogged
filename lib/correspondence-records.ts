export const correspondenceFolders = [
  "Banks & financial",
  "Insurance",
  "Government & HMRC",
  "Utilities",
  "Employers & pensions",
  "School & family",
  "Property",
  "Other",
] as const;

export type CorrespondenceFolder = (typeof correspondenceFolders)[number];
export type CorrespondenceStatus = "unread" | "action-needed" | "completed";

export type CorrespondenceAction = {
  id: string;
  label: string;
  completed: boolean;
};

export type CorrespondenceResponse = {
  id: string;
  note: string;
  createdAt: string;
};

export type CorrespondenceRecord = {
  id: string;
  documentId?: string;
  title: string;
  sender: string;
  correspondenceType: string;
  folder: CorrespondenceFolder;
  receivedDate: string;
  deadline: string;
  status: CorrespondenceStatus;
  reviewStatus: "needs-review" | "reviewed";
  summary: string;
  extractedText: string;
  actions: CorrespondenceAction[];
  contactName: string;
  contactPhone: string;
  contactUrl: string;
  linkedReminderIds: string[];
  linkedBillId?: string;
  linkedPolicyId?: string;
  responses: CorrespondenceResponse[];
  storageBucket?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
};

export type CorrespondenceCollection = {
  correspondence: CorrespondenceRecord[];
};

export function createInitialCorrespondenceCollection(): CorrespondenceCollection {
  return { correspondence: [] };
}

export function hydrateCorrespondenceCollection(
  value?: Partial<CorrespondenceCollection>,
): CorrespondenceCollection {
  return {
    correspondence: Array.isArray(value?.correspondence)
      ? value.correspondence.map((item) => ({
          ...item,
          actions: Array.isArray(item.actions) ? item.actions : [],
          linkedReminderIds: Array.isArray(item.linkedReminderIds)
            ? item.linkedReminderIds
            : [],
          responses: Array.isArray(item.responses) ? item.responses : [],
          reviewStatus:
            item.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
        }))
      : [],
  };
}
