import {
  EMERGENCY_ACCESS_SCHEMA_VERSION,
  parseEmergencyAccessDirectory,
  type EmergencyAccessDirectory,
  type EmergencyAccessMutation,
} from "@diarydock/emergency-access";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type EmergencyAccessResponse = {
  directory: EmergencyAccessDirectory;
  invitePath?: string;
};

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240 ? message : fallback;
}

function parseResponse(value: unknown): EmergencyAccessResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Trusted access returned an invalid response.");
  }
  const payload = value as Record<string, unknown>;
  if (payload.schemaVersion !== EMERGENCY_ACCESS_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to manage trusted access.");
  }
  const allowed = new Set(["schemaVersion", "directory", "invitePath"]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    throw new Error("Trusted access returned an invalid response.");
  }
  const invitePath = payload.invitePath;
  if (invitePath !== undefined && (typeof invitePath !== "string"
    || !/^\/emergency\/invite\/[A-Za-z0-9_-]{20,64}\/[A-Za-z0-9_-]{32,96}$/.test(invitePath))) {
    throw new Error("Trusted access returned an invalid invitation.");
  }
  return {
    directory: parseEmergencyAccessDirectory(payload.directory),
    ...(typeof invitePath === "string" ? { invitePath } : {}),
  };
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/emergency-access", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    signal: requestSignal(init?.signal),
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = await readBoundedJsonResponse(response, 256 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, "Trusted access is unavailable."));
  return parseResponse(payload);
}

export function loadMobileEmergencyAccess(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileEmergencyAccess(
  accessToken: string,
  mutation: EmergencyAccessMutation,
) {
  return request(accessToken, { method: "POST", body: JSON.stringify(mutation) });
}
