import { NextResponse } from "next/server";

import { HOUSEHOLD_DIRECTORY_SCHEMA_VERSION } from "@diarydock/household";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import {
  executeHouseholdMutation,
  householdText,
  loadHouseholdDirectory,
  loadHouseholdInvitePreview,
} from "@/lib/household/directory-server";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { checkServerRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

const actionFields: Record<string, ReadonlySet<string>> = {
  "accept-invite": new Set(["action", "token"]),
  "create-role-invite": new Set(["action", "email", "name", "relation", "role"]),
  "cancel-invite": new Set(["action", "token"]),
  "renew-invite": new Set(["action", "token"]),
  "update-role": new Set(["action", "userId", "role"]),
  "remove-member": new Set(["action", "userId"]),
  "initiate-ownership-transfer": new Set(["action", "userId"]),
  "resolve-ownership-transfer": new Set(["action", "transferId", "decision"]),
  rename: new Set(["action", "name"]),
  leave: new Set(["action"]),
};

function response(request: Request, body: Record<string, unknown>, status = 200) {
  const headers = mobileCorsHeaders(request);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  return NextResponse.json(body, { status, headers });
}

async function authenticate(request: Request) {
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return { error: response(request, { error: "Household access is unavailable." }, 503) };
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return { error: response(request, { error: "Please sign in again to manage your household." }, 401) };
  }
  return { auth };
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { user, supabase } = result.auth;
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:household:read", user.id), {
    limit: 120,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) return response(request, { error: "Household access is busy. Try again shortly." }, 429);
  const url = new URL(request.url);
  if (url.searchParams.get("view") === "invite") {
    const token = householdText(url.searchParams.get("token"), 120);
    if (!token) return response(request, { error: "The invitation link is incomplete." }, 400);
    const result = await loadHouseholdInvitePreview(supabase, token);
    if (result.error) return response(request, { error: "The invitation could not be opened." }, 503);
    return response(request, {
      schemaVersion: HOUSEHOLD_DIRECTORY_SCHEMA_VERSION,
      invite: result.invite,
    });
  }
  const household = await loadHouseholdDirectory(supabase, user.id);
  if (!household) return response(request, { error: "Your household could not be loaded." }, 503);
  return response(request, { schemaVersion: HOUSEHOLD_DIRECTORY_SCHEMA_VERSION, household });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { user, supabase } = result.auth;
  let body: Record<string, unknown>;
  try {
    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, unknown>;
  } catch (error) {
    return response(request, { error: "The household request is invalid." }, error instanceof RequestBodyError ? error.status : 400);
  }
  const action = householdText(body.action, 40);
  const allowed = actionFields[action];
  if (!allowed || Object.keys(body).some((key) => !allowed.has(key))) {
    return response(request, { error: "That household action is not supported." }, 400);
  }
  const ip = getForwardedClientIp(request.headers);
  const rate = await checkServerRateLimit(createRateLimitKey(`mobile:household:${action}`, user.id, ip), {
    limit: action.includes("invite") ? 20 : 60,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) return response(request, { error: "Please wait before changing household access again." }, 429);
  if (!hasRecentAuthentication(user.last_sign_in_at)) {
    return response(request, {
      error: "For your security, sign out and sign in again before changing household access.",
      code: "RECENT_AUTH_REQUIRED",
    }, 403);
  }
  const mutation = await executeHouseholdMutation(supabase, action, body);
  if (mutation.status !== 200) return response(request, mutation.body, mutation.status);
  const household = await loadHouseholdDirectory(supabase, user.id);
  if (!household) return response(request, { error: "The change was saved, but your household could not be refreshed." }, 503);
  return response(request, {
    ...mutation.body,
    schemaVersion: HOUSEHOLD_DIRECTORY_SCHEMA_VERSION,
    household,
  });
}
