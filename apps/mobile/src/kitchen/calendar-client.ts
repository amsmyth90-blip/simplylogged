import {
  parseKitchenCalendarSnapshot,
  type KitchenCalendarMutation,
  type KitchenCalendarSnapshot,
} from "@diarydock/kitchen";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type KitchenCalendarDraftMutation = KitchenCalendarMutation extends infer Mutation
  ? Mutation extends KitchenCalendarMutation ? Omit<Mutation, "revision"> : never : never;

export class KitchenCalendarConflictError extends Error {
  readonly snapshot: KitchenCalendarSnapshot;
  constructor(snapshot: KitchenCalendarSnapshot) {
    super("The Kitchen calendar changed on another device.");
    this.name = "KitchenCalendarConflictError";
    this.snapshot = snapshot;
  }
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function message(value: unknown, fallback: string) {
  const candidate = record(value)?.error;
  return typeof candidate === "string" && candidate.length <= 240 ? candidate : fallback;
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again.");
  }
  return `Bearer ${accessToken}`;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL(
    "/api/mobile/kitchen/calendar", getSecureRuntime().apiOrigin,
  ), {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    signal: requestDeadline(20_000),
  });
  const payload = await readBoundedJsonResponse(response, 288 * 1024);
  const body = record(payload);
  if (response.status === 409 && body?.snapshot) {
    throw new KitchenCalendarConflictError(parseKitchenCalendarSnapshot(body.snapshot));
  }
  if (!response.ok) throw new Error(message(payload, "The Kitchen calendar is unavailable."));
  return parseKitchenCalendarSnapshot(payload);
}

export function loadMobileKitchenCalendar(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileKitchenCalendar(
  accessToken: string,
  mutation: KitchenCalendarDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
