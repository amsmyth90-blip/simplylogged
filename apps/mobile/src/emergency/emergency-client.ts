import {
  parseEmergencySnapshot,
  type EmergencyMutation,
  type EmergencySnapshot,
} from "@diarydock/emergency";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type EmergencyDraftMutation = EmergencyMutation extends infer Mutation
  ? Mutation extends EmergencyMutation ? Omit<Mutation, "revision"> : never
  : never;

export class EmergencyConflictError extends Error {
  readonly snapshot: EmergencySnapshot;

  constructor(message: string, snapshot: EmergencySnapshot) {
    super(message);
    this.name = "EmergencyConflictError";
    this.snapshot = snapshot;
  }
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again.");
  }
  return `Bearer ${accessToken}`;
}

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240 ? message : fallback;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/emergency", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    signal: requestSignal(init?.signal),
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = await readBoundedJsonResponse(response, 128 * 1024);
  if (response.status === 409 && payload && typeof payload === "object"
    && !Array.isArray(payload) && "snapshot" in payload) {
    const snapshot = parseEmergencySnapshot((payload as Record<string, unknown>).snapshot);
    throw new EmergencyConflictError(
      errorMessage(payload, "Emergency changed on another device."),
      snapshot,
    );
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, "Emergency information is unavailable."));
  }
  return parseEmergencySnapshot(payload);
}

export function loadMobileEmergency(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileEmergency(
  accessToken: string,
  mutation: EmergencyDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
