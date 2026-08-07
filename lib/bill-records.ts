export const billCategories = [
  "Utilities",
  "Council tax",
  "Communications",
  "Subscriptions",
  "Home services",
  "Other"
] as const;

export type BillCategory = (typeof billCategories)[number];
export type BillStatus = "draft" | "active" | "paid" | "overdue" | "cancelled";
export type BillFrequency = "monthly" | "quarterly" | "annual" | "one-off";

export type BillHistoryEntry = {
  id: string;
  amount: number;
  dueDate: string;
  recordedAt: string;
};

export type BillRecord = {
  id: string;
  documentId?: string;
  title: string;
  provider: string;
  category: BillCategory;
  accountNumberMasked: string;
  amount: number;
  dueDate: string;
  frequency: BillFrequency;
  paymentMethod: string;
  directDebit: boolean;
  status: BillStatus;
  reviewStatus: "needs-review" | "reviewed";
  billingPeriodStart: string;
  billingPeriodEnd: string;
  contractEndDate: string;
  noticePeriodDays: number | null;
  usage: string;
  notes: string;
  storageBucket?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  history: BillHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type BillsRecord = {
  bills: BillRecord[];
};

export function createInitialBillsRecord(): BillsRecord {
  return { bills: [] };
}
export function hydrateBillsRecord(value?: Partial<BillsRecord>): BillsRecord {
  return {
    bills: Array.isArray(value?.bills)
      ? value.bills.map((bill) => ({
          ...bill,
          history: Array.isArray(bill.history) ? bill.history : [],
          reviewStatus: bill.reviewStatus === "reviewed" ? "reviewed" : "needs-review"
        }))
      : []
  };
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount || 0);
}

export function formatBillDate(value: string) {
  if (!value) return "No date set";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function effectiveBillStatus(bill: BillRecord, now = new Date()): BillStatus {
  if (bill.status === "draft" || bill.status === "paid" || bill.status === "cancelled") return bill.status;
  if (bill.dueDate && new Date(`${bill.dueDate}T23:59:59`).getTime() < now.getTime()) return "overdue";
  return "active";
}
