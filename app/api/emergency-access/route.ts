import { NextResponse } from "next/server";

import {
  parseEmergencyAccessMutation,
  type EmergencyAccessDirectory,
  type EmergencyAccessMutation,
} from "@diarydock/emergency-access";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import {
  loadEmergencyAccessDirectory,
  mutateEmergencyAccess,
} from "@/lib/emergency-access/service";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function response(
  observation: RequestObservation,
  body: unknown,
  status: number,
  outcome: string,
  records = 0,
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

function webDirectory(directory: EmergencyAccessDirectory) {
  return {
    contacts: directory.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      relation: contact.relation,
      status: contact.status,
      expires_at: contact.expiresAt,
      accepted_at: contact.acceptedAt,
      emergency_access_grants: contact.grants.map((grant) => ({
        id: grant.id,
        resource_type: grant.resourceType,
        resource_id: grant.resourceId,
        label: grant.label,
        granted_at: grant.grantedAt,
        revoked_at: grant.revokedAt,
      })),
    })),
    resources: directory.resources,
    received: directory.received.map((grant) => ({
      id: grant.id,
      resource_type: grant.resourceType,
      label: grant.label,
      snapshot: grant.snapshot,
      granted_at: grant.grantedAt,
      trusted_emergency_contacts: {
        name: grant.contactName,
        relation: grant.contactRelation,
        status: "ACTIVE",
      },
    })),
    notifications: directory.notifications.map((notice) => ({
      id: notice.id,
      event_type: notice.eventType,
      label: notice.label,
      created_at: notice.createdAt,
    })),
  };
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID");
  return value as Record<string, unknown>;
}

function webMutation(value: unknown): EmergencyAccessMutation {
  const body = record(value);
  if (body.operation === "GRANT" || body.operation === "REVOKE_GRANT") {
    const allowed = new Set(["operation", "contactId", "resourceType", "resourceId"]);
    if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error("INVALID");
    return parseEmergencyAccessMutation({
      operation: "SET_GRANT",
      contactId: body.contactId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      granted: body.operation === "GRANT",
    });
  }
  return parseEmergencyAccessMutation(body);
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "web-emergency-access-read",
    request,
    route: "/api/emergency-access",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(observation, { error: "Trusted access is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(observation, { error: "Please sign in again to manage emergency access." }, 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("web:emergency-access:read", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(observation, { error: "Trusted access is busy. Try again shortly." }, 429, "rate-limited");
  }
  const result = await loadEmergencyAccessDirectory(auth.supabase, auth.user.id);
  if (!result.directory) {
    return response(observation, { error: "Emergency access could not be loaded safely." }, 503, "database-unavailable");
  }
  return response(
    observation,
    webDirectory(result.directory),
    200,
    "ok",
    result.directory.contacts.length + result.directory.received.length,
  );
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "web-emergency-access-write",
    request,
    route: "/api/emergency-access",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(observation, { error: "Trusted access is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(observation, { error: "Please sign in again to change emergency access." }, 401, "unauthenticated");
  }
  if (!hasRecentAuthentication(auth.user.last_sign_in_at)) {
    return response(observation, {
      code: "RECENT_AUTH_REQUIRED",
      error: "For your security, please sign in again before changing trusted access.",
    }, 403, "recent-auth-required");
  }
  let mutation: EmergencyAccessMutation;
  try {
    mutation = webMutation(await readBoundedJson(request, 8 * 1024));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return response(observation, { error: "That emergency access request was not valid." }, status, "invalid-body");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("web:emergency-access:write", auth.user.id),
    { limit: 20, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return response(observation, { error: "Please wait before changing trusted access again." }, 429, "rate-limited");
  }
  const result = await mutateEmergencyAccess(auth.supabase, mutation);
  if (result.error) {
    return response(observation, { error: "That trusted-access change was not accepted." }, 409, "rejected");
  }
  return response(observation, {
    updated: true,
    ...(result.invitePath ? { invitePath: result.invitePath } : {}),
  }, mutation.operation === "CREATE_CONTACT" ? 201 : 200, "ok", 1);
}
