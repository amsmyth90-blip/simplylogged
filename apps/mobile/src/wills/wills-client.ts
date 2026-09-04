import {
  parseWillsSnapshot,
  type WillsMutation,
  type WillsSnapshot,
} from "@diarydock/wills";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again.");
  }
  return `Bearer ${accessToken}`;
}

export type WillsDraftMutation = WillsMutation extends infer Mutation
  ? Mutation extends WillsMutation ? Omit<Mutation, "revision"> : never
  : never;

export class WillsConflictError extends Error {
  constructor(message: string, readonly snapshot: WillsSnapshot) {
    super(message);
    this.name = "WillsConflictError";
  }
}

function errorMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "The Safe Room is unavailable.";
  }
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240
    ? message
    : "The Safe Room is unavailable.";
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/wills", getSecureRuntime().apiOrigin), {
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
  if (response.status === 409 && payload && typeof payload === "object" &&
    !Array.isArray(payload) && "snapshot" in payload) {
    throw new WillsConflictError(errorMessage(payload), parseWillsSnapshot(
      (payload as Record<string, unknown>).snapshot,
    ));
  }
  if (!response.ok) throw new Error(errorMessage(payload));
  return parseWillsSnapshot(payload);
}

export function loadMobileWills(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileWills(
  accessToken: string,
  mutation: WillsDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
