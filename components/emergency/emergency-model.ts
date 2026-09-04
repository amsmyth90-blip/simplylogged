export type EmergencyModalMode = "contact" | "plan" | "note" | null;
export type EmergencyContactDraft = { name: string; relation: string; phone: string; note: string };
export type EmergencyPlanDraft = { title: string; summary: string; steps: string };
export type EmergencyNoteDraft = { label: string; value: string };

export const defaultEmergencyContact: EmergencyContactDraft = { name: "", relation: "", phone: "", note: "" };
export const defaultEmergencyPlan: EmergencyPlanDraft = { title: "", summary: "", steps: "" };
export const defaultEmergencyNote: EmergencyNoteDraft = { label: "", value: "" };

export function emergencyInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "N";
}
