import type { VaultDocument } from "@/lib/mock-data";

export type LegacyHouseholdRole = "owner" | "member" | "viewer";

export function householdRoleLabel(role: LegacyHouseholdRole) {
  if (role === "owner") return "Owner";
  if (role === "member") return "Adult";
  return "Member";
}

export function householdRoleDescription(role: LegacyHouseholdRole) {
  if (role === "owner") {
    return "Manages people, invitations and household settings.";
  }

  if (role === "member") {
    return "Can contribute to shared household spaces and view items deliberately shared with them.";
  }

  return "Can view items deliberately shared with them, without managing the household.";
}

export function sharedDocumentSummary(input: {
  documents: VaultDocument[];
  currentUserId: string;
  targetUserId: string;
}) {
  const ownedDocuments = input.documents.filter(
    (document) => !document.ownerId || document.ownerId === input.currentUserId
  );
  const householdDocuments = ownedDocuments.filter(
    (document) => document.visibility === "HOUSEHOLD"
  );
  const selectedDocuments = ownedDocuments.filter(
    (document) =>
      document.visibility === "SELECTED_MEMBERS" &&
      document.sharedWithUserIds?.includes(input.targetUserId)
  );

  return {
    householdCount: householdDocuments.length,
    selectedCount: selectedDocuments.length,
    totalCount: householdDocuments.length + selectedDocuments.length
  };
}

export function householdAuditLabel(eventType: string) {
  const labels: Record<string, string> = {
    HOUSEHOLD_INVITE: "Invitation created",
    HOUSEHOLD_INVITE_CANCELLED: "Invitation cancelled",
    HOUSEHOLD_INVITE_RENEWED: "Invitation renewed",
    HOUSEHOLD_JOIN: "Someone joined the household",
    HOUSEHOLD_LEFT: "Someone left the household",
    HOUSEHOLD_MEMBER_REMOVED: "A member was removed",
    HOUSEHOLD_ROLE_CHANGED: "A member's role changed",
    HOUSEHOLD_RENAMED: "Household name changed",
    RESOURCE_SHARED: "A document was shared",
    RESOURCE_UNSHARED: "A document was made private"
  };

  return labels[eventType] ?? "Household access changed";
}
