import type { HouseholdRole } from "@diarydock/household";

export function roleLabel(role: HouseholdRole) {
  if (role === "owner") return "Owner";
  if (role === "member") return "Adult";
  return "Member";
}

export function roleDescription(role: HouseholdRole) {
  if (role === "owner") return "Manages people, invitations and household settings.";
  if (role === "member") return "Can contribute to shared spaces and view deliberately shared items.";
  return "Can view deliberately shared items without managing the household.";
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "DD";
}

export function friendlyDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
