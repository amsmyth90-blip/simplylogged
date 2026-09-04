import {
  parseHealthSnapshot,
  type HealthMutation,
  type HealthSnapshot,
} from "@diarydock/health";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again.");
  }
  return `Bearer ${accessToken}`;
}

export type HealthDraftMutation = HealthMutation extends infer Mutation
  ? Mutation extends HealthMutation
    ? Omit<Mutation, "revision">
    : never
  : never;

export class HealthConflictError extends Error {
  readonly snapshot: HealthSnapshot;

  constructor(message: string, snapshot: HealthSnapshot) {
    super(message);
    this.name = "HealthConflictError";
    this.snapshot = snapshot;
  }
}

function errorMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "My Health is unavailable.";
  }
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240
    ? message
    : "My Health is unavailable.";
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(
    new URL("/api/mobile/health", getSecureRuntime().apiOrigin),
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
    throw new HealthConflictError(
      errorMessage(payload),
      parseHealthSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(errorMessage(payload));
  return parseHealthSnapshot(payload);
}

export function loadMobileHealth(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileHealth(
  accessToken: string,
  mutation: HealthDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
