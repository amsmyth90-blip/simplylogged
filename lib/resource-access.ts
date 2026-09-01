export const resourceVisibilities = ["PRIVATE", "HOUSEHOLD", "SELECTED_MEMBERS"] as const;

export type ResourceVisibility = (typeof resourceVisibilities)[number];

export const householdRoles = ["OWNER", "ADULT", "MEMBER"] as const;

export type HouseholdRole = (typeof householdRoles)[number];

export const resourceActions = ["VIEW", "EDIT", "SHARE"] as const;

export type ResourceAction = (typeof resourceActions)[number];

export type SelectedMemberGrant = {
  userId: string;
  actions: ResourceAction[];
  revokedAt?: string;
};

export type ResourceAccessInput = {
  actorUserId: string;
  ownerUserId: string;
  action: ResourceAction;
  visibility: ResourceVisibility;
  isVaultResource?: boolean;
  membership?: {
    householdId: string;
    resourceHouseholdId: string;
    role: HouseholdRole;
    active: boolean;
  };
  selectedMemberGrants?: SelectedMemberGrant[];
};

export type ResourceAccessDecision = {
  allowed: boolean;
  reason:
    | "OWNER"
    | "VAULT_PRIVATE"
    | "PRIVATE"
    | "NO_ACTIVE_MEMBERSHIP"
    | "WRONG_HOUSEHOLD"
    | "HOUSEHOLD_VIEW"
    | "HOUSEHOLD_EDIT_DENIED"
    | "SELECTED_MEMBER"
    | "NO_SELECTED_MEMBER_GRANT";
};

export function decideResourceAccess(input: ResourceAccessInput): ResourceAccessDecision {
  if (input.actorUserId === input.ownerUserId) {
    return { allowed: true, reason: "OWNER" };
  }

  if (input.isVaultResource) {
    return { allowed: false, reason: "VAULT_PRIVATE" };
  }

  if (input.visibility === "PRIVATE") {
    return { allowed: false, reason: "PRIVATE" };
  }

  if (!input.membership?.active) {
    return { allowed: false, reason: "NO_ACTIVE_MEMBERSHIP" };
  }

  if (input.membership.householdId !== input.membership.resourceHouseholdId) {
    return { allowed: false, reason: "WRONG_HOUSEHOLD" };
  }

  if (input.visibility === "HOUSEHOLD") {
    if (input.action === "VIEW") {
      return { allowed: true, reason: "HOUSEHOLD_VIEW" };
    }

    return { allowed: false, reason: "HOUSEHOLD_EDIT_DENIED" };
  }

  const grant = input.selectedMemberGrants?.find(
    (candidate) => candidate.userId === input.actorUserId && !candidate.revokedAt
  );

  if (grant?.actions.includes(input.action)) {
    return { allowed: true, reason: "SELECTED_MEMBER" };
  }

  return { allowed: false, reason: "NO_SELECTED_MEMBER_GRANT" };
}

export function mapLegacyHouseholdRole(role: "owner" | "member" | "viewer"): HouseholdRole {
  if (role === "owner") return "OWNER";
  if (role === "member") return "ADULT";
  return "MEMBER";
}
