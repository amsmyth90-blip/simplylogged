import { parseTravelSnapshot, type TravelMutation, type TravelSnapshot } from "@diarydock/travel";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

type WithoutRevision<Value> = Value extends unknown ? Omit<Value, "revision"> : never;
export type TravelDraftMutation = WithoutRevision<TravelMutation>;

export class TravelConflictError extends Error {
  readonly snapshot: TravelSnapshot;

  constructor(message: string, snapshot: TravelSnapshot) {
    super(message);
    this.name = "TravelConflictError";
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
  const response = await fetch(new URL("/api/mobile/travel", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: requestDeadline(20_000),
  });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (response.status === 409 && payload && typeof payload === "object"
    && !Array.isArray(payload) && "snapshot" in payload) {
    throw new TravelConflictError(
      errorMessage(payload, "The Driveway changed on another device."),
      parseTravelSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(errorMessage(payload, "The Driveway is unavailable."));
  return parseTravelSnapshot(payload);
}

export function loadMobileTravel(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileTravel(
  accessToken: string,
  mutation: TravelDraftMutation,
  revision: string | null,
) {
  return request(accessToken, { method: "POST", body: JSON.stringify({ ...mutation, revision }) });
}
