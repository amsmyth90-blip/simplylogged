import type { HouseholdRole } from "@/lib/household-sharing";

export type InviteDraft = {
  name: string;
  email: string;
  relation: string;
  role: Exclude<HouseholdRole, "owner">;
};

export const emptyInvite: InviteDraft = {
  name: "",
  email: "",
  relation: "",
  role: "viewer",
};

export function memberInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "DD"
  );
}

export function friendlyAccessDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
