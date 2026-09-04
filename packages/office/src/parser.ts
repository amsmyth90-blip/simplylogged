import {
  OFFICE_BILL_DETAIL_SCHEMA_VERSION,
  OFFICE_BILLS_SCHEMA_VERSION,
  officeBillCategories,
  officeBillFrequencies,
  officeBillStatuses,
  type OfficeBill,
  type OfficeBillDetail,
  type OfficeBillDetailRequest,
  type OfficeBillCategory,
  type OfficeBillFrequency,
  type OfficeBillHistory,
  type OfficeBillsSnapshot,
  type OfficeBillStatus,
  type SaveOfficeBill,
} from "./types.ts";
import {
  boolean,
  date,
  exact,
  finiteNumber,
  list,
  nullableInteger,
  optionalText,
  record,
  text,
} from "./validation.ts";

function member<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${label} is invalid.`);
  return value as T;
}

function history(value: unknown): OfficeBillHistory {
  const item = record(value, "Bill history");
  exact(item, ["id", "amount", "dueDate", "recordedAt"], "Bill history");
  return {
    id: text(item.id, "History ID", 128),
    amount: finiteNumber(item.amount, "History amount", 0, 10_000_000),
    dueDate: date(item.dueDate, "History due date"),
    recordedAt: text(item.recordedAt, "History time", 40),
  };
}

export function parseSaveOfficeBill(value: unknown): SaveOfficeBill {
  const bill = record(value, "Bill");
  exact(bill, ["title", "provider", "category", "accountNumberMasked", "amount",
    "dueDate", "frequency", "paymentMethod", "directDebit", "status",
    "billingPeriodStart", "billingPeriodEnd", "contractEndDate", "noticePeriodDays",
    "usage", "notes"], "Bill");
  const title = text(bill.title, "Bill title", 160, true);
  const provider = text(bill.provider, "Bill provider", 160, true);
  if (!title && !provider) throw new Error("Add a bill title or provider.");
  return {
    title,
    provider,
    category: member(bill.category, officeBillCategories, "Bill category") as OfficeBillCategory,
    accountNumberMasked: text(bill.accountNumberMasked, "Masked account reference", 80, true),
    amount: finiteNumber(bill.amount, "Bill amount", 0, 10_000_000),
    dueDate: date(bill.dueDate, "Bill due date"),
    frequency: member(bill.frequency, officeBillFrequencies, "Bill frequency") as OfficeBillFrequency,
    paymentMethod: text(bill.paymentMethod, "Payment method", 120, true),
    directDebit: boolean(bill.directDebit, "Direct Debit choice"),
    status: member(bill.status, officeBillStatuses, "Bill status") as OfficeBillStatus,
    billingPeriodStart: date(bill.billingPeriodStart, "Billing start"),
    billingPeriodEnd: date(bill.billingPeriodEnd, "Billing end"),
    contractEndDate: date(bill.contractEndDate, "Contract end"),
    noticePeriodDays: nullableInteger(bill.noticePeriodDays, "Notice period", 0, 3_650),
    usage: text(bill.usage, "Bill usage", 240, true),
    notes: text(bill.notes, "Bill notes", 4_000, true),
  };
}

export function parseOfficeBillRecord(value: unknown): OfficeBill {
  const item = record(value, "Bill record");
  exact(item, ["contentComplete", "id", "documentId", "title", "provider", "category",
    "accountNumberMasked", "amount", "dueDate", "frequency", "paymentMethod",
    "directDebit", "status", "reviewStatus", "billingPeriodStart", "billingPeriodEnd",
    "contractEndDate", "noticePeriodDays", "usage", "notes", "history", "updatedAt"],
  "Bill record");
  const bill = parseSaveOfficeBill({
    title: item.title,
    provider: item.provider,
    category: item.category,
    accountNumberMasked: item.accountNumberMasked,
    amount: item.amount,
    dueDate: item.dueDate,
    frequency: item.frequency,
    paymentMethod: item.paymentMethod,
    directDebit: item.directDebit,
    status: item.status,
    billingPeriodStart: item.billingPeriodStart,
    billingPeriodEnd: item.billingPeriodEnd,
    contractEndDate: item.contractEndDate,
    noticePeriodDays: item.noticePeriodDays,
    usage: item.usage,
    notes: item.notes,
  });
  if (item.reviewStatus !== "needs-review" && item.reviewStatus !== "reviewed") {
    throw new Error("Bill review status is invalid.");
  }
  return {
    contentComplete: boolean(item.contentComplete, "Bill completeness"),
    id: text(item.id, "Bill ID", 128),
    documentId: optionalText(item.documentId, "Document ID", 128),
    ...bill,
    reviewStatus: item.reviewStatus,
    history: list(item.history, "Bill history", 200).map(history),
    updatedAt: text(item.updatedAt, "Bill update time", 40),
  };
}

export function parseOfficeBillsSnapshot(value: unknown): OfficeBillsSnapshot {
  const snapshot = record(value, "Office bills snapshot");
  exact(snapshot, ["schemaVersion", "revision", "bills"], "Office bills snapshot");
  if (snapshot.schemaVersion !== OFFICE_BILLS_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Office bills.");
  }
  return {
    schemaVersion: OFFICE_BILLS_SCHEMA_VERSION,
    revision: optionalText(snapshot.revision, "Office revision", 40),
    bills: list(snapshot.bills, "Office bills", 500).map(parseOfficeBillRecord),
  };
}

export function parseOfficeBillDetailRequest(value: unknown): OfficeBillDetailRequest {
  const item = record(value, "Office bill detail request");
  exact(item, ["billId"], "Office bill detail request");
  return { billId: text(item.billId, "Bill ID", 128) };
}

export function parseOfficeBillDetail(value: unknown): OfficeBillDetail {
  const item = record(value, "Office bill detail");
  exact(item, ["schemaVersion", "bill"], "Office bill detail");
  if (item.schemaVersion !== OFFICE_BILL_DETAIL_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this bill.");
  }
  const bill = parseOfficeBillRecord(item.bill);
  if (!bill.contentComplete) throw new Error("Office bill detail is incomplete.");
  return { schemaVersion: OFFICE_BILL_DETAIL_SCHEMA_VERSION, bill };
}
