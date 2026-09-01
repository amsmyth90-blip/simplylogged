import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  HouseholdAccessEvent,
  HouseholdDirectory,
  HouseholdDirectoryMember,
  HouseholdInvitePreview,
  HouseholdRole,
} from "@/lib/household-sharing";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const auditEventTypes = [
  "HOUSEHOLD_INVITE",
  "HOUSEHOLD_INVITE_CANCELLED",
  "HOUSEHOLD_INVITE_RENEWED",
  "HOUSEHOLD_JOIN",
  "HOUSEHOLD_LEFT",
  "HOUSEHOLD_MEMBER_REMOVED",
  "HOUSEHOLD_ROLE_CHANGED",
  "HOUSEHOLD_RENAMED",
  "RESOURCE_SHARED",
  "RESOURCE_UNSHARED",
];

function textValue(value: unknown, maximumLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function isHouseholdRole(value: string): value is Exclude<HouseholdRole, "owner"> {
  return value === "member" || value === "viewer";
}

function rpcFailure(message: string, error?: { message?: string } | null) {
  return NextResponse.json({ error: error?.message ?? message }, { status: 400 });
}

async function loadDirectory(
  supabase: SupabaseClient,
  currentUserId: string,
): Promise<HouseholdDirectory | null> {
  const { data: householdId, error: householdError } = await supabase.rpc("ensure_user_household");
  if (householdError || !householdId) return null;

  const [householdResult, membersResult, invitesResult] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
    supabase
      .from("household_memberships")
      .select("user_id, role, display_name, relation, joined_at")
      .eq("household_id", householdId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    supabase
      .from("household_invites")
      .select("token, email, name, relation, access, created_at, expires_at")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (householdResult.error || membersResult.error) return null;

  const members: HouseholdDirectoryMember[] = (membersResult.data ?? []).map((row) => ({
    userId: String(row.user_id),
    name: String(row.display_name || "Household member"),
    relation: String(row.relation || "Household member"),
    role: row.role as HouseholdRole,
    joinedAt: String(row.joined_at),
  }));
  const currentMembership = members.find((member) => member.userId === currentUserId);
  if (!currentMembership) return null;

  return {
    householdId: String(householdId),
    householdName: String(householdResult.data?.name ?? "My household"),
    currentUserId,
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
          expiresAt: String(row.expires_at),
        })),
  };
}

export async function GET(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Household sharing is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const url = new URL(request.url);
  const view = url.searchParams.get("view");

  if (view === "invite") {
    const token = textValue(url.searchParams.get("token"), 120);
    if (!token) return NextResponse.json({ error: "The invitation link is incomplete." }, { status: 400 });

    const { data, error } = await supabase.rpc("get_household_invite", { invite_token: token });
    if (error) return rpcFailure("The invitation could not be opened.", error);
    const row = Array.isArray(data) ? data[0] : data;
    const invite: HouseholdInvitePreview | null = row
      ? {
          token: String(row.token),
          householdName: String(row.household_name),
          name: String(row.invite_name),
          relation: String(row.relation),
          access: String(row.access),
          expiresAt: String(row.expires_at),
        }
      : null;
    return NextResponse.json({ invite });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in again to manage household access." }, { status: 401 });
  }

  if (view === "events") {
    const householdId = textValue(url.searchParams.get("householdId"), 80);
    const { data: currentHouseholdId, error: householdError } = await supabase.rpc("ensure_user_household");
    if (householdError || !currentHouseholdId || String(currentHouseholdId) !== householdId) {
      return NextResponse.json({ error: "That household history is not available." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("audit_events")
      .select("id, user_id, event_type, created_at, metadata")
      .eq("household_id", householdId)
      .in("event_type", auditEventTypes)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) return NextResponse.json({ events: [] });

    const events: HouseholdAccessEvent[] = (data ?? []).map((row) => ({
      id: String(row.id),
      actorUserId: String(row.user_id),
      eventType: String(row.event_type),
      createdAt: String(row.created_at),
      metadata: row.metadata && typeof row.metadata === "object"
        ? row.metadata as Record<string, unknown>
        : {},
    }));
    return NextResponse.json({ events });
  }

  return NextResponse.json({ household: await loadDirectory(supabase, authData.user.id) });
}

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Household sharing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch((): Record<string, unknown> => ({}));
  const action = textValue(body.action, 40);
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in again to manage household access." }, { status: 401 });
  }

  if (action === "create-invite" || action === "create-role-invite") {
    const email = textValue(body.email, 254).toLowerCase();
    const name = textValue(body.name, 100);
    const relation = textValue(body.relation, 100);
    if (!name || !email.includes("@") || !relation) {
      return NextResponse.json({ error: "Add a name, relationship and valid email address." }, { status: 400 });
    }

    if (action === "create-role-invite") {
      const role = textValue(body.role, 20);
      if (!isHouseholdRole(role)) {
        return NextResponse.json({ error: "Choose a valid household role." }, { status: 400 });
      }
      const { data, error } = await supabase.rpc("create_household_role_invite", {
        invite_email: email,
        invite_name: name,
        invite_relation: relation,
        invite_role: role,
      });
      if (error || !data) return rpcFailure("The invitation could not be created.", error);
      return NextResponse.json({ token: String(data) });
    }

    const access = textValue(body.access, 120);
    const { data, error } = await supabase.rpc("create_household_invite", {
      invite_email: email,
      invite_name: name,
      invite_relation: relation,
      invite_access: access,
    });
    if (error || !data) return rpcFailure("The invite could not be created.", error);
    return NextResponse.json({ token: String(data) });
  }

  const token = textValue(body.token, 120);
  if (["accept-invite", "cancel-invite", "renew-invite"].includes(action) && !token) {
    return NextResponse.json({ error: "The invitation link is incomplete." }, { status: 400 });
  }

  if (action === "accept-invite") {
    const { data, error } = await supabase.rpc("accept_household_invite", { invite_token: token });
    if (error || !data) return rpcFailure("The invite could not be accepted.", error);
    return NextResponse.json({ householdId: String(data) });
  }
  if (action === "cancel-invite") {
    const { data, error } = await supabase.rpc("cancel_household_invite", { invite_token: token });
    if (error || !data) return rpcFailure("The invite could not be cancelled.", error);
    return NextResponse.json({ ok: true });
  }
  if (action === "renew-invite") {
    const { data, error } = await supabase.rpc("renew_household_invite", { invite_token: token });
    if (error || !data) return rpcFailure("The invite could not be renewed.", error);
    return NextResponse.json({ ok: true });
  }
  if (action === "update-role") {
    const userId = textValue(body.userId, 80);
    const role = textValue(body.role, 20);
    if (!userId || !isHouseholdRole(role)) {
      return NextResponse.json({ error: "Choose a valid member and role." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("update_household_member_role", {
      member_user_id: userId,
      new_role: role,
    });
    if (error || !data) return rpcFailure("The member's access could not be changed.", error);
    return NextResponse.json({ ok: true });
  }
  if (action === "remove-member") {
    const userId = textValue(body.userId, 80);
    if (!userId) return NextResponse.json({ error: "Choose a household member." }, { status: 400 });
    const { data, error } = await supabase.rpc("remove_household_member", { member_user_id: userId });
    if (error || !data) return rpcFailure("The household member could not be removed.", error);
    return NextResponse.json({ ok: true });
  }
  if (action === "rename") {
    const name = textValue(body.name, 80);
    if (!name) return NextResponse.json({ error: "Enter a household name." }, { status: 400 });
    const { data, error } = await supabase.rpc("rename_household", { new_name: name });
    if (error || !data) return rpcFailure("The household name could not be changed.", error);
    return NextResponse.json({ ok: true });
  }
  if (action === "leave") {
    const { data, error } = await supabase.rpc("leave_household");
    if (error || !data) return rpcFailure("You could not leave this household.", error);
    return NextResponse.json({ householdId: String(data) });
  }

  return NextResponse.json({ error: "That household action is not supported." }, { status: 400 });
}
