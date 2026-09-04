import {
  parseHouseholdSchedulesSnapshot,
  type HouseholdSchedulesMutation,
  type HouseholdSchedulesSnapshot,
} from "@diarydock/household";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

type WithoutRevision<T> = T extends unknown ? Omit<T, "revision"> : never;
export type HouseholdSchedulesDraftMutation = WithoutRevision<HouseholdSchedulesMutation>;

export class HouseholdSchedulesConflictError extends Error {
  readonly snapshot: HouseholdSchedulesSnapshot;

  constructor(message: string, snapshot: HouseholdSchedulesSnapshot) {
    super(message);
    this.name = "HouseholdSchedulesConflictError";
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
  const response = await fetch(
    new URL("/api/mobile/family/schedules", getSecureRuntime().apiOrigin),
    {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: authorization(accessToken),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      signal: requestDeadline(20_000),
    },
  );
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (response.status === 409 && payload && typeof payload === "object"
    && !Array.isArray(payload) && "snapshot" in payload) {
    throw new HouseholdSchedulesConflictError(
      errorMessage(payload, "Family Schedules changed on another device."),
      parseHouseholdSchedulesSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, "Family Schedules are unavailable."));
  }
  return parseHouseholdSchedulesSnapshot(payload);
}

export function loadMobileHouseholdSchedules(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileHouseholdSchedules(
  accessToken: string,
  mutation: HouseholdSchedulesDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
