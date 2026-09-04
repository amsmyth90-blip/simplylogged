import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseHouseholdDirectory,
  type HouseholdDirectory,
  type HouseholdInvitePreview,
  type HouseholdRole,
} from "@diarydock/household";

export type HouseholdMutationResult = {
  body: Record<string, unknown>;
  status: number;
};

export function householdText(value: unknown, maximumLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function isManagedRole(value: string): value is Exclude<HouseholdRole, "owner"> {
  return value === "member" || value === "viewer";
}

function failure(error: string, status = 400): HouseholdMutationResult {
  return { body: { error }, status };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function loadHouseholdInvitePreview(
  supabase: SupabaseClient,
  token: string,
): Promise<{ error: boolean; invite: HouseholdInvitePreview | null }> {
  if (!isUuid(token)) return { error: false, invite: null };
  const { data, error } = await supabase.rpc("get_household_invite", { invite_token: token });
  if (error) return { error: true, invite: null };
  const row = Array.isArray(data) ? data[0] : data;
  return { error: false, invite: row ? {
    token: String(row.token),
    householdName: String(row.household_name),
    name: String(row.invite_name),
    relation: String(row.relation),
    access: String(row.access),
    expiresAt: String(row.expires_at),
  } : null };
}

function ownershipMutationResult(
  data: unknown,
  error: { message?: string } | null,
  action: string,
): HouseholdMutationResult {
  if (error?.message?.includes("Recent authentication required")) {
    return failure("Sign out and sign in again before changing household ownership.", 403);
  }
  if (error) return failure("Household ownership could not be updated.", 503);
  const row = Array.isArray(data) ? data[0] : data;
  const status = row && typeof row === "object" ? String((row as Record<string, unknown>).status) : "";
  if (status === "OK") return { body: { ok: true }, status: 200 };
  if (status === "INVALID_TARGET") return failure("Choose an active Adult household member.");
  if (status === "NOT_OWNER" || status === "FORBIDDEN") {
    return failure("You are not permitted to make that ownership change.", 403);
  }
  if (status === "EXPIRED") return failure("This ownership request has expired.", 409);
  if (status === "NOT_FOUND") return failure("This ownership request is no longer active.", 409);
  if (status === "RATE_LIMITED") return failure("Please wait before changing household ownership again.", 429);
  return failure(action === "start" ? "The ownership request could not be started."
    : "The ownership request could not be completed.", 503);
}

export async function loadHouseholdDirectory(
  supabase: SupabaseClient,
  currentUserId: string,
): Promise<HouseholdDirectory | null> {
  const { data: householdId, error: householdError } = await supabase.rpc("ensure_user_household");
  if (householdError || !householdId) return null;

  const [householdResult, membersResult, invitesResult, transferResult] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
    supabase.from("household_memberships")
      .select("user_id, role, display_name, relation, joined_at")
      .eq("household_id", householdId)
      .eq("status", "active")
      .order("joined_at", { ascending: true })
      .limit(20),
    supabase.from("household_invites")
      .select("token, email, name, relation, access, created_at, expires_at")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20),
    supabase.from("household_ownership_transfers")
      .select("id, initiated_by, proposed_owner_id, created_at, expires_at")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
  ]);
  if (householdResult.error || membersResult.error) return null;

  const members = (membersResult.data ?? []).map((row) => ({
    userId: String(row.user_id),
    name: String(row.display_name || "Household member"),
    relation: String(row.relation || "Household member"),
    role: String(row.role),
    joinedAt: String(row.joined_at),
  }));
  const currentMembership = members.find((member) => member.userId === currentUserId);
  if (!currentMembership) return null;
  const transfer = transferResult.error ? null : transferResult.data;
  const transferIsValid = transfer && members.some((member) =>
    member.userId === String(transfer.initiated_by) && member.role === "owner")
    && members.some((member) =>
      member.userId === String(transfer.proposed_owner_id) && member.role === "member");

  try {
    return parseHouseholdDirectory({
      householdId: String(householdId),
      householdName: String(householdResult.data?.name ?? "My household"),
      currentUserId,
      role: currentMembership.role,
      members,
      invites: invitesResult.error ? [] : (invitesResult.data ?? []).map((row) => ({
        token: String(row.token),
        email: String(row.email),
        name: String(row.name),
        relation: String(row.relation),
        access: String(row.access),
        createdAt: String(row.created_at),
        expiresAt: String(row.expires_at),
      })),
      ownershipTransfer: !transferIsValid ? null : {
        id: String(transfer.id),
        currentOwnerId: String(transfer.initiated_by),
        proposedOwnerId: String(transfer.proposed_owner_id),
        createdAt: String(transfer.created_at),
        expiresAt: String(transfer.expires_at),
      },
    });
  } catch {
    return null;
  }
}

export async function executeHouseholdMutation(
  supabase: SupabaseClient,
  action: string,
  body: Record<string, unknown>,
): Promise<HouseholdMutationResult> {
  if (action === "create-invite" || action === "create-role-invite") {
    const email = householdText(body.email, 254).toLowerCase();
    const name = householdText(body.name, 100);
    const relation = householdText(body.relation, 100);
    if (!name || !email.includes("@") || !relation) {
      return failure("Add a name, relationship and valid email address.");
    }
    if (action === "create-role-invite") {
      const role = householdText(body.role, 20);
      if (!isManagedRole(role)) return failure("Choose a valid household role.");
      const { data, error } = await supabase.rpc("create_household_role_invite", {
        invite_email: email,
        invite_name: name,
        invite_relation: relation,
        invite_role: role,
      });
      return error || !data
        ? failure("The invitation could not be created.", 503)
        : { body: { token: String(data) }, status: 200 };
    }
    const access = householdText(body.access, 120);
    const { data, error } = await supabase.rpc("create_household_invite", {
      invite_email: email,
      invite_name: name,
      invite_relation: relation,
      invite_access: access,
    });
    return error || !data
      ? failure("The invitation could not be created.", 503)
      : { body: { token: String(data) }, status: 200 };
  }

  const token = householdText(body.token, 120);
  if (["accept-invite", "cancel-invite", "renew-invite"].includes(action) && !token) {
    return failure("The invitation link is incomplete.");
  }
  if (action === "accept-invite") {
    const { data, error } = await supabase.rpc("accept_household_invite", { invite_token: token });
    if (error?.message?.includes("Recent authentication required")) {
      return failure("Sign out and sign in again before joining this household.", 403);
    }
    if (error?.message?.includes("already belongs to another household")) {
      return failure("This account already belongs to another household.", 409);
    }
    if (error?.message?.includes("email address")) {
      return failure("Sign in with the email address this invitation was created for.", 403);
    }
    if (error?.message?.includes("no longer active")) {
      return failure("This invitation is no longer active.", 410);
    }
    if (error?.message?.includes("Too many invitation attempts")) {
      return failure("Please wait before trying this invitation again.", 429);
    }
    return error || !data ? failure("The invitation could not be accepted.", 503)
      : { body: { householdId: String(data) }, status: 200 };
  }
  if (action === "cancel-invite" || action === "renew-invite") {
    const rpc = action === "cancel-invite" ? "cancel_household_invite" : "renew_household_invite";
    const { data, error } = await supabase.rpc(rpc, { invite_token: token });
    return error || !data ? failure("The invitation could not be updated.", 503)
      : { body: { ok: true }, status: 200 };
  }
  if (action === "update-role") {
    const userId = householdText(body.userId, 128);
    const role = householdText(body.role, 20);
    if (!userId || !isManagedRole(role)) return failure("Choose a valid member and role.");
    const { data, error } = await supabase.rpc("update_household_member_role", {
      member_user_id: userId,
      new_role: role,
    });
    return error || !data ? failure("The member's access could not be changed.", 503)
      : { body: { ok: true }, status: 200 };
  }
  if (action === "remove-member") {
    const userId = householdText(body.userId, 128);
    if (!userId) return failure("Choose a household member.");
    const { data, error } = await supabase.rpc("remove_household_member", { member_user_id: userId });
    return error || !data ? failure("The household member could not be removed.", 503)
      : { body: { ok: true }, status: 200 };
  }
  if (action === "rename") {
    const name = householdText(body.name, 80);
    if (!name) return failure("Enter a household name.");
    const { data, error } = await supabase.rpc("rename_household", { new_name: name });
    return error || !data ? failure("The household name could not be changed.", 503)
      : { body: { ok: true }, status: 200 };
  }
  if (action === "leave") {
    const { data, error } = await supabase.rpc("leave_household");
    return error || !data ? failure("You could not leave this household.", 503)
      : { body: { householdId: String(data) }, status: 200 };
  }
  if (action === "initiate-ownership-transfer") {
    const userId = householdText(body.userId, 128);
    if (!isUuid(userId)) return failure("Choose an eligible household member.");
    const { data, error } = await supabase.rpc("initiate_household_ownership_transfer", {
      input_proposed_owner_id: userId,
    });
    return ownershipMutationResult(data, error, "start");
  }
  if (action === "resolve-ownership-transfer") {
    const transferId = householdText(body.transferId, 128);
    const decision = householdText(body.decision, 20);
    if (!isUuid(transferId) || !["accept", "decline", "cancel"].includes(decision)) {
      return failure("That ownership transfer decision is invalid.");
    }
    const { data, error } = await supabase.rpc("resolve_household_ownership_transfer", {
      input_transfer_id: transferId,
      input_decision: decision,
    });
    return ownershipMutationResult(data, error, decision);
  }
  return failure("That household action is not supported.");
}
