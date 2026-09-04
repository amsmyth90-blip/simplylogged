import { NextResponse } from "next/server";

import type { HouseholdAccessEvent } from "@diarydock/household";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import {
  executeHouseholdMutation,
  householdText,
  loadHouseholdDirectory,
  loadHouseholdInvitePreview,
} from "@/lib/household/directory-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { checkServerRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const auditEventTypes = [
  "HOUSEHOLD_INVITE", "HOUSEHOLD_INVITE_CANCELLED", "HOUSEHOLD_INVITE_RENEWED",
  "HOUSEHOLD_JOIN", "HOUSEHOLD_LEFT", "HOUSEHOLD_MEMBER_REMOVED",
  "HOUSEHOLD_ROLE_CHANGED", "HOUSEHOLD_RENAMED", "RESOURCE_SHARED", "RESOURCE_UNSHARED",
  "HOUSEHOLD_OWNERSHIP_TRANSFER_REQUESTED", "HOUSEHOLD_OWNERSHIP_TRANSFER_ACCEPTED",
  "HOUSEHOLD_OWNERSHIP_TRANSFER_DECLINED", "HOUSEHOLD_OWNERSHIP_TRANSFER_CANCELLED",
];

const recentAuthenticationActions = new Set([
  "create-invite", "create-role-invite", "cancel-invite", "renew-invite",
  "accept-invite", "update-role", "remove-member", "rename", "leave", "initiate-ownership-transfer",
  "resolve-ownership-transfer",
]);

const actionFields: Record<string, ReadonlySet<string>> = {
  "create-invite": new Set(["action", "email", "name", "relation", "access"]),
  "create-role-invite": new Set(["action", "email", "name", "relation", "role"]),
  "accept-invite": new Set(["action", "token"]),
  "cancel-invite": new Set(["action", "token"]),
  "renew-invite": new Set(["action", "token"]),
  "update-role": new Set(["action", "userId", "role"]),
  "remove-member": new Set(["action", "userId"]),
  "initiate-ownership-transfer": new Set(["action", "userId"]),
  "resolve-ownership-transfer": new Set(["action", "transferId", "decision"]),
  rename: new Set(["action", "name"]),
  leave: new Set(["action"]),
};

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(request: Request) {
  if (!isSupabaseConfiguredServer()) return response({ error: "Household sharing is not configured." }, 503);
  const supabase = await getSupabaseServerClient();
  const url = new URL(request.url);
  const view = url.searchParams.get("view");

  if (view === "invite") {
    const token = householdText(url.searchParams.get("token"), 120);
    if (!token) return response({ error: "The invitation link is incomplete." }, 400);
    const ip = getForwardedClientIp(request.headers);
    const rate = await checkServerRateLimit(createRateLimitKey("household:invite:read", ip), {
      limit: 60,
      windowMs: 10 * 60_000,
    });
    if (!rate.allowed) return response({ error: "Please wait before opening another invitation." }, 429);
    const result = await loadHouseholdInvitePreview(supabase, token);
    return result.error ? response({ error: "The invitation could not be opened." }, 503)
      : response({ invite: result.invite });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return response({ error: "Please sign in again to manage household access." }, 401);
  const rate = await checkServerRateLimit(createRateLimitKey("household:read", authData.user.id), {
    limit: 120,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) return response({ error: "Household access is busy. Try again shortly." }, 429);

  if (view === "events") {
    const householdId = householdText(url.searchParams.get("householdId"), 128);
    const { data: currentHouseholdId, error } = await supabase.rpc("ensure_user_household");
    if (error || !currentHouseholdId || String(currentHouseholdId) !== householdId) {
      return response({ error: "That household history is not available." }, 403);
    }
    const result = await supabase.from("audit_events")
      .select("id, user_id, event_type, created_at, metadata")
      .eq("household_id", householdId)
      .in("event_type", auditEventTypes)
      .order("created_at", { ascending: false })
      .limit(12);
    const events: HouseholdAccessEvent[] = result.error ? [] : (result.data ?? []).map((row) => ({
      id: String(row.id),
      actorUserId: String(row.user_id),
      eventType: String(row.event_type),
      createdAt: String(row.created_at),
      metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {},
    }));
    return response({ events });
  }
  return response({ household: await loadHouseholdDirectory(supabase, authData.user.id) });
}

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) return response({ error: "Household sharing is not configured." }, 503);
  let body: Record<string, unknown>;
  try {
    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, unknown>;
  } catch (error) {
    return response({ error: "The household request is invalid." }, error instanceof RequestBodyError ? error.status : 400);
  }
  const action = householdText(body.action, 40);
  const allowed = actionFields[action];
  if (!allowed || Object.keys(body).some((key) => !allowed.has(key))) {
    return response({ error: "That household action is not supported." }, 400);
  }
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return response({ error: "Please sign in again to manage household access." }, 401);
  const ip = getForwardedClientIp(request.headers);
  const rate = await checkServerRateLimit(createRateLimitKey(`household:${action || "invalid"}`, authData.user.id, ip), {
    limit: action.includes("invite") ? 20 : 60,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) return response({ error: "Please wait before changing household access again." }, 429);
  if (recentAuthenticationActions.has(action) && !hasRecentAuthentication(authData.user.last_sign_in_at)) {
    return response({
      error: "For your security, sign out and sign in again before changing household access.",
      code: "RECENT_AUTH_REQUIRED",
    }, 403);
  }
  const result = await executeHouseholdMutation(supabase, action, body);
  return response(result.body, result.status);
}
