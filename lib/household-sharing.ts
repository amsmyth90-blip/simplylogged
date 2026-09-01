"use client";

export type HouseholdInvitePreview = {
  token: string;
  householdName: string;
  name: string;
  relation: string;
  access: string;
  expiresAt: string;
};

export type HouseholdRole = "owner" | "member" | "viewer";

export type HouseholdDirectoryMember = {
  userId: string;
  name: string;
  relation: string;
  role: HouseholdRole;
  joinedAt: string;
};

export type HouseholdDirectoryInvite = {
  token: string;
  email: string;
  name: string;
  relation: string;
  access: string;
  createdAt: string;
  expiresAt: string;
};

export type HouseholdDirectory = {
  householdId: string;
  householdName: string;
  currentUserId: string;
  role: HouseholdRole;
  members: HouseholdDirectoryMember[];
  invites: HouseholdDirectoryInvite[];
};

export type HouseholdAccessEvent = {
  id: string;
  actorUserId: string;
  eventType: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type ApiError = { error?: string };

async function householdRequest<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/household${path}`, {
    ...init,
    cache: "no-store",
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const payload = await response.json().catch((): ApiError => ({}));

  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? "Household access could not be updated.");
  }

  return payload as T;
}

async function householdMutation<T>(action: string, values: Record<string, unknown> = {}) {
  return householdRequest<T>("", {
    method: "POST",
    body: JSON.stringify({ action, ...values }),
  });
}

export async function createHouseholdInvite(input: {
  email: string;
  name: string;
  relation: string;
  access: string;
}) {
  const payload = await householdMutation<{ token: string }>("create-invite", input);
  return payload.token;
}

export async function createHouseholdRoleInvite(input: {
  email: string;
  name: string;
  relation: string;
  role: Exclude<HouseholdRole, "owner">;
}) {
  const payload = await householdMutation<{ token: string }>("create-role-invite", input);
  return payload.token;
}

export async function getHouseholdInvite(token: string): Promise<HouseholdInvitePreview | null> {
  const payload = await householdRequest<{ invite: HouseholdInvitePreview | null }>(
    `?view=invite&token=${encodeURIComponent(token)}`,
  );
  return payload.invite;
}

export async function acceptHouseholdInvite(token: string) {
  const payload = await householdMutation<{ householdId: string }>("accept-invite", { token });
  return payload.householdId;
}

export async function cancelHouseholdInvite(token: string) {
  await householdMutation("cancel-invite", { token });
}

export async function renewHouseholdInvite(token: string) {
  await householdMutation("renew-invite", { token });
}

export async function loadHouseholdDirectory(): Promise<HouseholdDirectory | null> {
  const payload = await householdRequest<{ household: HouseholdDirectory | null }>();
  return payload.household;
}

export async function updateHouseholdMemberRole(
  userId: string,
  role: Exclude<HouseholdRole, "owner">,
) {
  await householdMutation("update-role", { userId, role });
}

export async function removeHouseholdMember(userId: string) {
  await householdMutation("remove-member", { userId });
}

export async function renameHousehold(name: string) {
  await householdMutation("rename", { name: name.trim() });
}

export async function leaveHousehold() {
  const payload = await householdMutation<{ householdId: string }>("leave");
  return payload.householdId;
}

export async function loadHouseholdAccessEvents(householdId: string): Promise<HouseholdAccessEvent[]> {
  const payload = await householdRequest<{ events: HouseholdAccessEvent[] }>(
    `?view=events&householdId=${encodeURIComponent(householdId)}`,
  );
  return payload.events;
}
