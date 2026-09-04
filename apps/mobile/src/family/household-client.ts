import {
  HOUSEHOLD_DIRECTORY_SCHEMA_VERSION,
  parseHouseholdDirectory,
  parseHouseholdInvitePreview,
  type HouseholdDirectory,
  type HouseholdInvitePreview,
} from "@diarydock/household";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type HouseholdMutation =
  | { action: "accept-invite" | "cancel-invite" | "renew-invite"; token: string }
  | { action: "create-role-invite"; email: string; name: string; relation: string; role: "member" | "viewer" }
  | { action: "leave" }
  | { action: "initiate-ownership-transfer"; userId: string }
  | { action: "remove-member"; userId: string }
  | { action: "rename"; name: string }
  | { action: "resolve-ownership-transfer"; transferId: string; decision: "accept" | "decline" | "cancel" }
  | { action: "update-role"; userId: string; role: "member" | "viewer" };

export type HouseholdResponse = {
  household: HouseholdDirectory;
  token?: string;
};

function authentication(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function parseResponse(value: unknown): HouseholdResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Household response is invalid.");
  const payload = value as Record<string, unknown>;
  if (payload.schemaVersion !== HOUSEHOLD_DIRECTORY_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this household.");
  }
  const allowed = new Set(["household", "householdId", "ok", "schemaVersion", "token"]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) throw new Error("Household response is invalid.");
  return {
    household: parseHouseholdDirectory(payload.household),
    token: typeof payload.token === "string" ? payload.token : undefined,
  };
}

async function authorizedRequest(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(new URL(path, getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    signal: requestSignal(init?.signal),
    headers: {
      Accept: "application/json",
      Authorization: authentication(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await readBoundedJsonResponse(response, 96 * 1024) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Household access could not be updated.");
  }
  return payload;
}

async function request(accessToken: string, init?: RequestInit) {
  return parseResponse(await authorizedRequest(accessToken, "/api/mobile/household", init));
}

export function loadMobileHousehold(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileHousehold(accessToken: string, mutation: HouseholdMutation) {
  return request(accessToken, { method: "POST", body: JSON.stringify(mutation) });
}

export async function loadMobileHouseholdInvite(
  accessToken: string,
  token: string,
): Promise<HouseholdInvitePreview | null> {
  const path = `/api/mobile/household?view=invite&token=${encodeURIComponent(token)}`;
  const payload = await authorizedRequest(accessToken, path);
  const allowed = new Set(["schemaVersion", "invite"]);
  if (Object.keys(payload).some((key) => !allowed.has(key))
    || payload.schemaVersion !== HOUSEHOLD_DIRECTORY_SCHEMA_VERSION) {
    throw new Error("Household invitation response is invalid.");
  }
  return payload.invite === null ? null : parseHouseholdInvitePreview(payload.invite);
}
