import {
  parseKitchenSnapshot,
  type KitchenMutation,
  type KitchenSnapshot,
} from "@diarydock/kitchen";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type KitchenDraftMutation = KitchenMutation extends infer Mutation
  ? Mutation extends KitchenMutation ? Omit<Mutation, "revision"> : never
  : never;

export class KitchenConflictError extends Error {
  readonly snapshot: KitchenSnapshot;

  constructor(message: string, snapshot: KitchenSnapshot) {
    super(message);
    this.name = "KitchenConflictError";
    this.snapshot = snapshot;
  }
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240 ? message : fallback;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/kitchen", getSecureRuntime().apiOrigin), {
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
    throw new KitchenConflictError(
      errorMessage(payload, "The Kitchen changed on another device."),
      parseKitchenSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(errorMessage(payload, "The Kitchen is unavailable."));
  return parseKitchenSnapshot(payload);
}

export function loadMobileKitchen(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileKitchen(
  accessToken: string,
  mutation: KitchenDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
