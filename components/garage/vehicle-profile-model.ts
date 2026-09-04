import type { VaultDocument } from "@/lib/mock-data";
import type {
  VehicleExpense,
  VehicleNote,
  VehicleOwnershipStatus,
  VehicleRecord,
  VehicleServiceKind,
} from "@/lib/vehicle-records";

export type VehicleTab =
  | "overview"
  | "servicing"
  | "repairs"
  | "costs"
  | "documents"
  | "notes";

export type DialogKind =
  | "vehicle"
  | "mileage"
  | "service"
  | "expense"
  | "note"
  | "reminder"
  | null;

export const profileTabs: { id: VehicleTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Photos & Notes" },
];

export const serviceTabs: { id: VehicleTab; label: string }[] = [
  { id: "servicing", label: "Servicing" },
  { id: "repairs", label: "Repairs" },
];

export const emptyVehicleDraft = {
  nickname: "",
  make: "",
  model: "",
  variant: "",
  registration: "",
  vin: "",
  year: "",
  colour: "",
  fuelType: "",
  transmission: "",
  drivetrain: "",
  engineSize: "",
  category: "",
  seatingCapacity: "",
  ownershipStatus: "unknown" as VehicleOwnershipStatus,
  keeperName: "",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  currentValueUpdatedAt: "",
  motDueDate: "",
  taxDueDate: "",
  insuranceRenewalDate: "",
  nextServiceDate: "",
  breakdownRenewalDate: "",
  financeProvider: "",
  financeAgreementEndDate: "",
  warrantyProvider: "",
  warrantyEndDate: "",
};

export const emptyServiceDraft = {
  kind: "service" as VehicleServiceKind,
  title: "",
  provider: "",
  date: "",
  nextServiceDate: "",
  mileage: "",
  cost: "",
  notes: "",
};

export const emptyExpenseDraft = {
  category: "Other" as VehicleExpense["category"],
  title: "",
  provider: "",
  amount: "",
  date: "",
  mileage: "",
  paymentMethod: "",
  recurring: false,
  linkedServiceId: "",
  documentId: "",
  notes: "",
};

export type VehicleDraft = typeof emptyVehicleDraft;
export type MileageDraft = { mileage: string; date: string; note: string };
export type ServiceDraft = typeof emptyServiceDraft;
export type ExpenseDraft = typeof emptyExpenseDraft;
export type NoteDraft = {
  kind: VehicleNote["kind"];
  title: string;
  content: string;
};
export type ReminderDraft = { title: string; date: string; note: string };

export function vehicleDraftFromRecord(vehicle: VehicleRecord): VehicleDraft {
  return {
    nickname: vehicle.nickname,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    registration: vehicle.registration,
    vin: vehicle.vin,
    year: vehicle.year?.toString() ?? "",
    colour: vehicle.colour,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    engineSize: vehicle.engineSize,
    category: vehicle.category,
    seatingCapacity: vehicle.seatingCapacity?.toString() ?? "",
    ownershipStatus: vehicle.ownershipStatus,
    keeperName: vehicle.keeperName,
    purchaseDate: vehicle.purchaseDate,
    purchasePrice: vehicle.purchasePrice?.toString() ?? "",
    currentValue: vehicle.currentValue?.toString() ?? "",
    currentValueUpdatedAt: vehicle.currentValueUpdatedAt,
    motDueDate: vehicle.motDueDate,
    taxDueDate: vehicle.taxDueDate,
    insuranceRenewalDate: vehicle.insuranceRenewalDate,
    nextServiceDate: vehicle.nextServiceDate,
    breakdownRenewalDate: vehicle.breakdownRenewalDate,
    financeProvider: vehicle.financeProvider,
    financeAgreementEndDate: vehicle.financeAgreementEndDate,
    warrantyProvider: vehicle.warrantyProvider,
    warrantyEndDate: vehicle.warrantyEndDate,
  };
}

export function expenseDraftFromRecord(expense: VehicleExpense): ExpenseDraft {
  return {
    category: expense.category,
    title: expense.title,
    provider: expense.provider,
    amount: String(expense.amount),
    date: expense.date,
    mileage: expense.mileage?.toString() ?? "",
    paymentMethod: expense.paymentMethod ?? "",
    recurring: expense.recurring ?? false,
    linkedServiceId: expense.linkedServiceId ?? "",
    documentId: expense.documentId ?? "",
    notes: expense.notes,
  };
}

export function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not recorded";
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function daysUntil(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`).getTime();
  if (Number.isNaN(date)) return null;
  return Math.ceil((date - Date.now()) / 86_400_000);
}

export function dateHelper(value: string) {
  const days = daysUntil(value);
  if (days === null) return { text: "Add date", tone: "text-[#667068]" };
  if (days < 0) return { text: `${Math.abs(days)} days overdue`, tone: "text-[#a4473d]" };
  if (days === 0) return { text: "Due today", tone: "text-[#a4473d]" };
  if (days <= 30) return { text: `${days} days left`, tone: "text-[#a46b2c]" };
  return { text: `in ${days} days`, tone: "text-[#317047]" };
}

export function inputNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function imageSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function cleanText(value: string) {
  return value
    .replaceAll("Ã¢â‚¬â€", "—")
    .replaceAll("â€”", "—")
    .replaceAll("Â·", "·");
}

export function vehicleDocumentCategory(document: VaultDocument) {
  const text = `${document.title} ${document.category} ${document.extractionSummary ?? ""}`.toLowerCase();
  if (/insurance|policy certificate|motor cover/.test(text)) return "Insurance";
  if (/\bmot\b/.test(text)) return "MOT";
  if (/v5c|logbook|log book|registration certificate/.test(text)) return "V5C & ownership";
  if (/service history|service book|maintenance/.test(text)) return "Service history";
  if (/repair|mechanic|garage invoice/.test(text)) return "Repairs";
  if (/finance|lease|hire purchase|agreement/.test(text)) return "Finance";
  if (/warranty|guarantee/.test(text)) return "Warranties";
  if (/breakdown|roadside/.test(text)) return "Breakdown cover";
  return "Other";
}

export function audit(action: string) {
  return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() };
}
