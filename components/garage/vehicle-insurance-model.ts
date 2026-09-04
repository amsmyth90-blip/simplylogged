import type {
  VehicleInsuranceClaim,
  VehicleInsuranceRenewal,
  VehicleMotorInsurance,
} from "@/lib/vehicle-records";

export type InsuranceDialog = "policy" | "driver" | "claim" | "renewal" | "documents" | null;
export type InsuranceTriState = "unknown" | "yes" | "no";

export const emptyPolicyDraft = {
  provider: "", policyNumber: "", status: "not-recorded" as VehicleMotorInsurance["status"],
  policyStartDate: "", renewalDate: "", premium: "", paymentFrequency: "", coverType: "",
  voluntaryExcess: "", compulsoryExcess: "", noClaimsYears: "",
  courtesyCar: "unknown" as InsuranceTriState,
  windscreenCover: "unknown" as InsuranceTriState,
  legalExpensesCover: "unknown" as InsuranceTriState,
  breakdownIncluded: "unknown" as InsuranceTriState,
  providerPhone: "", claimsPhone: "", notes: "", breakdownProvider: "",
  breakdownPolicyNumber: "", breakdownRenewalDate: "",
};

export const emptyDriverDraft = { name: "", relationship: "", mainDriver: false, notes: "" };
export const emptyClaimDraft = {
  incidentDate: "", claimType: "", status: "draft" as VehicleInsuranceClaim["status"],
  reference: "", description: "", documentId: "",
};
export const emptyRenewalDraft = {
  renewalDate: "", provider: "", premium: "",
  outcome: "upcoming" as VehicleInsuranceRenewal["outcome"], notes: "", documentId: "",
};

export function formatInsuranceDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

export function formatInsuranceMoney(value: number | null) {
  return value === null ? "Not recorded" : new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", minimumFractionDigits: 2,
  }).format(value);
}

export function insuranceRenewalMessage(value: string) {
  if (!value) return { label: "Add renewal date", tone: "text-[#667068]" };
  const target = new Date(`${value}T12:00:00`).getTime();
  const days = Number.isNaN(target) ? null : Math.ceil((target - Date.now()) / 86_400_000);
  if (days === null) return { label: "Add renewal date", tone: "text-[#667068]" };
  if (days < 0) return { label: `${Math.abs(days)} days overdue`, tone: "text-[#a4473d]" };
  if (days === 0) return { label: "Due today", tone: "text-[#a46b2c]" };
  return { label: `in ${days} days`, tone: days <= 30 ? "text-[#a46b2c]" : "text-[#315d45]" };
}

export function insuranceNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function booleanToTriState(value: boolean | null): InsuranceTriState {
  return value === null ? "unknown" : value ? "yes" : "no";
}

export function triStateToBoolean(value: InsuranceTriState) {
  return value === "unknown" ? null : value === "yes";
}

export function insuranceBooleanLabel(value: boolean | null) {
  return value === null ? "Not recorded" : value ? "Included" : "Not included";
}

export function insuranceAudit(action: string) {
  return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() };
}

export function humanInsuranceStatus(value: string) {
  return value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}
