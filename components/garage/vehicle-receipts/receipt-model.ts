import type { IconName } from "@/components/UiIcon";
import { formatDate as sharedFormatDate } from "@/lib/presentation";
import type { VehicleExpense } from "@/lib/vehicle-records";

export type ExpenseCategory = VehicleExpense["category"];
export type ReceiptDraft = typeof emptyReceiptDraft;

export const receiptCategories: ExpenseCategory[] = [
  "Service",
  "Fuel",
  "Repair",
  "Tyres",
  "Insurance",
  "Tax",
  "Breakdown",
  "Parking",
  "Other",
];

export const categoryIcons: Record<ExpenseCategory, IconName> = {
  Service: "gear",
  Fuel: "file",
  Repair: "gear",
  Tyres: "gear",
  Insurance: "shield",
  Tax: "calendar",
  Breakdown: "car",
  Parking: "map-pin",
  Other: "archive",
};

export const categoryColours: Record<ExpenseCategory, string> = {
  Service: "#17643c",
  Fuel: "#e5a91d",
  Repair: "#d45b43",
  Tyres: "#6e57c7",
  Insurance: "#5577bb",
  Tax: "#4b917d",
  Breakdown: "#c8882a",
  Parking: "#7656c2",
  Other: "#9aa09b",
};

export const emptyReceiptDraft = {
  title: "",
  provider: "",
  date: "",
  amount: "",
  category: "Other" as ExpenseCategory,
  mileage: "",
  paymentMethod: "",
  receiptNumber: "",
  notes: "",
  linkedServiceId: "",
};

export function receiptDraft(expense: VehicleExpense): ReceiptDraft {
  return {
    title: expense.title,
    provider: expense.provider,
    date: expense.date,
    amount: String(expense.amount),
    category: expense.category,
    mileage: expense.mileage?.toString() ?? "",
    paymentMethod: expense.paymentMethod ?? "",
    receiptNumber: expense.receiptNumber ?? "",
    notes: expense.notes,
    linkedServiceId: expense.linkedServiceId ?? "",
  };
}

export function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatReceiptDate(value: string) {
  return sharedFormatDate(value, "2-digit");
}

export function monthLabel(value: string) {
  const date = new Date(`${value}-01T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function vehicleAudit(action: string) {
  return {
    id: crypto.randomUUID(),
    action,
    createdAt: new Date().toISOString(),
  };
}
