"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

function requireClient() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Household sharing is not configured.");
  }

  return client;
}

export async function createHouseholdInvite(input: {
  email: string;
  name: string;
  relation: string;
  access: string;
}) {
  const client = requireClient();
  const { data, error } = await client.rpc("create_household_invite", {
    invite_email: input.email,
    invite_name: input.name,
    invite_relation: input.relation,
    invite_access: input.access
  });

  if (error || !data) {
    throw new Error(error?.message ?? "The invite could not be created.");
  }

  return String(data);
}

export async function getHouseholdInvite(token: string): Promise<HouseholdInvitePreview | null> {
  const client = requireClient();
  const { data, error } = await client.rpc("get_household_invite", {
    invite_token: token
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return {
    token: String(row.token),
    householdName: String(row.household_name),
    name: String(row.invite_name),
    relation: String(row.relation),
    access: String(row.access),
    expiresAt: String(row.expires_at)
  };
}

export async function acceptHouseholdInvite(token: string) {
  const client = requireClient();
  const { data, error } = await client.rpc("accept_household_invite", {
    invite_token: token
  });

  if (error || !data) {
    throw new Error(error?.message ?? "The invite could not be accepted.");
  }

  return String(data);
}

export async function cancelHouseholdInvite(token: string) {
  const client = requireClient();
  const { data, error } = await client.rpc("cancel_household_invite", {
    invite_token: token
  });

  if (error || !data) {
    throw new Error(error?.message ?? "The invite could not be cancelled.");
  }
}

export async function renewHouseholdInvite(token: string) {
  const client = requireClient();
  const { data, error } = await client.rpc("renew_household_invite", {
    invite_token: token
  });

  if (error || !data) {
    throw new Error(error?.message ?? "The invite could not be renewed.");
  }
}

export async function loadHouseholdDirectory(): Promise<HouseholdDirectory | null> {
  const client = requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError || !authData.user) {
    return null;
  }

  const { data: householdId, error: householdError } = await client.rpc("ensure_user_household");
  if (householdError || !householdId) {
    return null;
  }

  const [householdResult, membersResult, invitesResult] = await Promise.all([
    client.from("households").select("name").eq("id", householdId).maybeSingle(),
    client
      .from("household_memberships")
      .select("user_id, role, display_name, relation, joined_at")
      .eq("household_id", householdId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    client
      .from("household_invites")
      .select("token, email, name, relation, access, created_at, expires_at")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
  ]);

  if (householdResult.error || membersResult.error) {
    return null;
  }

  const members: HouseholdDirectoryMember[] = (membersResult.data ?? []).map((row) => ({
    userId: String(row.user_id),
    name: String(row.display_name || "Household member"),
    relation: String(row.relation || "Household member"),
    role: row.role as HouseholdRole,
    joinedAt: String(row.joined_at)
  }));
  const currentMembership = members.find((member) => member.userId === authData.user.id);

  if (!currentMembership) {
    return null;
  }

  return {
    householdId: String(householdId),
    householdName: String(householdResult.data?.name ?? "My household"),
    currentUserId: authData.user.id,
    role: currentMembership.role,
    members,
    invites: invitesResult.error
      ? []
      : (invitesResult.data ?? []).map((row) => ({
          token: String(row.token),
          email: String(row.email),
          name: String(row.name),
          relation: String(row.relation),
          access: String(row.access),
          createdAt: String(row.created_at),
          expiresAt: String(row.expires_at)
        }))
  };
}

export async function updateHouseholdMemberRole(
  userId: string,
  role: Exclude<HouseholdRole, "owner">
) {
  const client = requireClient();
  const { data, error } = await client.rpc("update_household_member_role", {
    member_user_id: userId,
    new_role: role
  });

  if (error || !data) {
    throw new Error(error?.message ?? "The member's access could not be changed.");
  }
}

export async function removeHouseholdMember(userId: string) {
  const client = requireClient();
  const { data, error } = await client.rpc("remove_household_member", {
    member_user_id: userId
  });

  if (error || !data) {
    throw new Error(error?.message ?? "The household member could not be removed.");
  }
}
