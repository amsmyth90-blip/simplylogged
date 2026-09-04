export const OFFICE_BILLS_SCHEMA_VERSION = 1;
export const OFFICE_BILL_DETAIL_SCHEMA_VERSION = 1;

export const officeBillCategories = [
  "Utilities",
  "Council tax",
  "Communications",
  "Subscriptions",
  "Home services",
  "Other",
] as const;

export const officeBillFrequencies = [
  "monthly",
  "quarterly",
  "annual",
  "one-off",
] as const;

export const officeBillStatuses = [
  "draft",
  "active",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type OfficeBillCategory = (typeof officeBillCategories)[number];
export type OfficeBillFrequency = (typeof officeBillFrequencies)[number];
export type OfficeBillStatus = (typeof officeBillStatuses)[number];

export type OfficeBillHistory = {
  id: string;
  amount: number;
  dueDate: string;
  recordedAt: string;
};

export type OfficeBill = {
  contentComplete: boolean;
  id: string;
  documentId: string | null;
  title: string;
  provider: string;
  category: OfficeBillCategory;
  accountNumberMasked: string;
  amount: number;
  dueDate: string;
  frequency: OfficeBillFrequency;
  paymentMethod: string;
  directDebit: boolean;
  status: OfficeBillStatus;
  reviewStatus: "needs-review" | "reviewed";
  billingPeriodStart: string;
  billingPeriodEnd: string;
  contractEndDate: string;
  noticePeriodDays: number | null;
  usage: string;
  notes: string;
  history: OfficeBillHistory[];
  updatedAt: string;
};

export type OfficeBillsSnapshot = {
  schemaVersion: typeof OFFICE_BILLS_SCHEMA_VERSION;
  revision: string | null;
  bills: OfficeBill[];
};

export type SaveOfficeBill = Omit<
  OfficeBill,
  "contentComplete" | "documentId" | "history" | "id" | "reviewStatus" | "updatedAt"
>;

export type OfficeBillDetailRequest = { billId: string };
export type OfficeBillDetail = {
  schemaVersion: typeof OFFICE_BILL_DETAIL_SCHEMA_VERSION;
  bill: OfficeBill;
};

export type OfficeBillMutation = {
  operation: "SAVE_BILL";
  revision: string | null;
  billId: string | null;
  bill: SaveOfficeBill;
};
