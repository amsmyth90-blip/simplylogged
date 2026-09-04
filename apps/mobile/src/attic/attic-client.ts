import {
  parseAtticSnapshot,
  type AtticMutation,
  type AtticSnapshot,
} from "@diarydock/attic";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type AtticDraftMutation = Omit<AtticMutation, "revision">;

export class AtticConflictError extends Error {
  readonly snapshot: AtticSnapshot;

  constructor(message: string, snapshot: AtticSnapshot) {
    super(message);
    this.name = "AtticConflictError";
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240
    ? message
    : fallback;
}

async function request(
  accessToken: string,
  init?: RequestInit,
  cursor: string | null = null,
) {
  const url = new URL("/api/mobile/attic", getSecureRuntime().apiOrigin);
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: requestSignal(init?.signal),
      headers: {
        Accept: "application/json",
        Authorization: authorization(accessToken),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
  });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (
    response.status === 409 &&
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "snapshot" in payload
  ) {
    throw new AtticConflictError(
      errorMessage(payload, "The Attic changed on another device."),
      parseAtticSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, "The Attic is unavailable."));
  }
  return parseAtticSnapshot(payload);
}

export function loadMobileAttic(accessToken: string, cursor: string | null = null) {
  return request(accessToken, undefined, cursor);
}

export function mutateMobileAttic(
  accessToken: string,
  mutation: AtticDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
