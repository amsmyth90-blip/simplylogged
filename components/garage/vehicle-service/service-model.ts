import type {
  VehicleRecord,
  VehicleServiceEntry,
  VehicleServiceKind,
} from "@/lib/vehicle-records";

export type ServiceDialog = "service" | "reminder" | null;
export type ServiceRecordsView =
  | "overview"
  | "history"
  | "maintenance"
  | "reminders";
export type ServiceHistoryFilter = "all" | "service" | "inspection";
export type ServiceDraft = typeof emptyServiceDraft;
export type ReminderDraft = typeof emptyReminderDraft;

export const emptyServiceDraft = {
  kind: "service" as Exclude<VehicleServiceKind, "repair">,
  title: "",
  provider: "",
  date: "",
  mileage: "",
  cost: "",
  paymentMethod: "",
  workItems: "",
  notes: "",
  nextServiceDate: "",
  nextServiceMileage: "",
  documentIds: [] as string[],
};

export const emptyReminderDraft = { title: "", dueDate: "", note: "" };

export function formatServiceDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatServiceMoney(value: number | null) {
  return value === null
    ? "Not recorded"
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
      }).format(value);
}

export function serviceNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function daysUntil(value: string) {
  if (!value) return null;
  const timestamp = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(timestamp)
    ? null
    : Math.ceil((timestamp - Date.now()) / 86_400_000);
}

export function serviceAudit(action: string) {
  return {
    id: crypto.randomUUID(),
    action,
    createdAt: new Date().toISOString(),
  };
}

export function cleanWorkItems(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function newServiceDraft(
  vehicle: VehicleRecord,
  kind: Exclude<VehicleServiceKind, "repair">,
): ServiceDraft {
  return {
    ...emptyServiceDraft,
    kind,
    nextServiceDate: vehicle.nextServiceDate,
    nextServiceMileage: vehicle.nextServiceMileage?.toString() ?? "",
  };
}

export function editServiceDraft(
  vehicle: VehicleRecord,
  entry: VehicleServiceEntry,
): ServiceDraft {
  return {
    kind: entry.kind === "inspection" ? "inspection" : "service",
    title: entry.title,
    provider: entry.provider,
    date: entry.date,
    mileage: entry.mileage?.toString() ?? "",
    cost: entry.cost?.toString() ?? "",
    paymentMethod: entry.paymentMethod ?? "",
    workItems: (entry.workItems ?? []).join("\n"),
    notes: entry.notes,
    nextServiceDate: entry.nextServiceDate || vehicle.nextServiceDate,
    nextServiceMileage:
      (entry.nextServiceMileage ?? vehicle.nextServiceMileage)?.toString() ??
      "",
    documentIds: [...entry.documentIds],
  };
}

export function duplicateServiceDraft(
  entry: VehicleServiceEntry,
): ServiceDraft {
  return {
    kind: entry.kind === "inspection" ? "inspection" : "service",
    title: entry.title,
    provider: entry.provider,
    date: "",
    mileage: "",
    cost: "",
    paymentMethod: entry.paymentMethod ?? "",
    workItems: (entry.workItems ?? []).join("\n"),
    notes: entry.notes,
    nextServiceDate: "",
    nextServiceMileage: "",
    documentIds: [],
  };
}
