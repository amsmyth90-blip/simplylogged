import type { IconName } from "@/components/UiIcon";
import type { VehicleMotRecord, VehicleRecord } from "@/lib/vehicle-records";

export type MotTaxView =
  | "overview"
  | "history"
  | "road-tax"
  | "key-dates"
  | "documents";
export type MotTaxDialog = "mot" | "tax" | null;
export type DocumentFilter = "All" | "MOT" | "Tax";

export const emptyMotDraft = {
  testDate: "",
  result: "pass" as VehicleMotRecord["result"],
  mileage: "",
  advisoryCount: "",
  notes: "",
  documentId: "",
};

export const emptyTaxDraft = {
  renewalDate: "",
  amount: "",
  paymentFrequency: "",
  paidDate: "",
  paymentReference: "",
  vehicleClass: "",
  documentId: "",
};

export function formatMotDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMotMoney(value: number | null) {
  if (value === null) return "Not recorded";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function motNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function dateStatus(value: string) {
  const days = daysUntil(value);
  if (days === null) {
    return { text: "Add date", tone: "bg-[#eef0e9] text-[#667068]" };
  }
  if (days < 0) {
    return {
      text: `${Math.abs(days)} days overdue`,
      tone: "bg-[#fbe5df] text-[#a4473d]",
    };
  }
  if (days <= 30) {
    return { text: `${days} days`, tone: "bg-[#fbedd8] text-[#a46b2c]" };
  }
  return { text: `${days} days`, tone: "bg-[#e9f0e4] text-[#52705a]" };
}

export function vehicleKeyDates(vehicle: VehicleRecord) {
  return [
    {
      label: "MOT due",
      value: vehicle.motDueDate,
      icon: "calendar" as IconName,
    },
    {
      label: "Road tax renewal",
      value: vehicle.taxDueDate,
      icon: "file" as IconName,
    },
    {
      label: "Insurance renewal",
      value: vehicle.insuranceRenewalDate,
      icon: "shield" as IconName,
    },
    {
      label: "Service due",
      value: vehicle.nextServiceDate,
      icon: "gear" as IconName,
    },
    {
      label: "Breakdown cover",
      value: vehicle.breakdownRenewalDate,
      icon: "car" as IconName,
    },
  ];
}

export function motAudit(action: string) {
  return {
    id: crypto.randomUUID(),
    action,
    createdAt: new Date().toISOString(),
  };
}

function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86_400_000);
}
