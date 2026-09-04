import type { OfficeBill } from "@diarydock/office";

export function formatOfficeMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount || 0);
}

export function formatOfficeDate(value: string) {
  if (!value) return "No date set";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function effectiveOfficeBillStatus(bill: OfficeBill, now = new Date()) {
  if (bill.status === "draft" || bill.status === "paid" || bill.status === "cancelled") {
    return bill.status;
  }
  return bill.dueDate && new Date(`${bill.dueDate}T23:59:59`).getTime() < now.getTime()
    ? "overdue"
    : "active";
}
