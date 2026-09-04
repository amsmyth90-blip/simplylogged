import type { IconName } from "@/components/UiIcon";
import type { VehicleExpense } from "@/lib/vehicle-records";

export type VehicleCostView =
  | "overview"
  | "categories"
  | "expenses"
  | "insights";
export type Period = "month" | "year" | "all";
export type ExpenseCategory = VehicleExpense["category"];

export const categories: ExpenseCategory[] = [
  "Service",
  "Fuel",
  "Insurance",
  "Tax",
  "Repair",
  "Breakdown",
  "Tyres",
  "Parking",
  "Other",
];

export const categoryStyle: Record<
  ExpenseCategory,
  { colour: string; soft: string; icon: IconName; label: string }
> = {
  Service: {
    colour: "#17643c",
    soft: "#e8f2e9",
    icon: "gear",
    label: "Servicing",
  },
  Fuel: { colour: "#e5a91d", soft: "#fff4d8", icon: "file", label: "Fuel" },
  Insurance: {
    colour: "#6e57c7",
    soft: "#eeeafd",
    icon: "shield",
    label: "Insurance",
  },
  Tax: { colour: "#3c82c9", soft: "#e7f1fb", icon: "file", label: "Road tax" },
  Repair: {
    colour: "#d45b43",
    soft: "#fbe9e4",
    icon: "gear",
    label: "Repairs",
  },
  Breakdown: {
    colour: "#c8882a",
    soft: "#f8eedc",
    icon: "car",
    label: "Breakdown cover",
  },
  Tyres: { colour: "#323b36", soft: "#e9ebe9", icon: "gear", label: "Tyres" },
  Parking: {
    colour: "#7656c2",
    soft: "#eeeafd",
    icon: "map-pin",
    label: "Parking",
  },
  Other: {
    colour: "#9aa09b",
    soft: "#eef0ee",
    icon: "archive",
    label: "Other",
  },
};

export function money(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function shortDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function monthLabel(key: string) {
  const date = new Date(`${key}-01T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function expenseInPeriod(expense: VehicleExpense, period: Period) {
  if (period === "all") return true;
  const date = new Date(`${expense.date}T12:00:00`);
  const now = new Date();
  if (period === "year") return date.getFullYear() === now.getFullYear();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function expenseCsv(expenses: VehicleExpense[]) {
  const quote = (value: string | number | boolean | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = expenses.map((expense) =>
    [
      expense.date,
      expense.category,
      expense.title,
      expense.provider,
      expense.amount.toFixed(2),
      expense.mileage,
      expense.paymentMethod,
      expense.recurring ? "Yes" : "No",
      expense.notes,
    ]
      .map(quote)
      .join(","),
  );
  return [
    "Date,Category,Title,Provider,Amount GBP,Mileage,Payment method,Recurring,Notes",
    ...rows,
  ].join("\r\n");
}
