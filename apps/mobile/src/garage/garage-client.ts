import {
  parseGarageSnapshot,
  type GarageMutation,
  type GarageSnapshot,
} from "@diarydock/vehicles";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type GarageDraftMutation = GarageMutation extends infer Mutation
  ? Mutation extends GarageMutation
    ? Omit<Mutation, "revision">
    : never
  : never;

export class GarageConflictError extends Error {
  readonly snapshot: GarageSnapshot;

  constructor(message: string, snapshot: GarageSnapshot) {
    super(message);
    this.name = "GarageConflictError";
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
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240
    ? message
    : fallback;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(
    new URL("/api/mobile/garage", getSecureRuntime().apiOrigin),
    {
      ...init,
      cache: "no-store",
      signal: requestSignal(init?.signal),
      headers: {
        Accept: "application/json",
        Authorization: authorization(accessToken),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    },
  );
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (
    response.status === 409 &&
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "snapshot" in payload
  ) {
    throw new GarageConflictError(
      errorMessage(payload, "The Garage changed on another device."),
      parseGarageSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok)
    throw new Error(errorMessage(payload, "The Garage is unavailable."));
  return parseGarageSnapshot(payload);
}

export function loadMobileGarage(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileGarage(
  accessToken: string,
  mutation: GarageDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
