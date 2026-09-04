import {
  parseOfficeContactDetail,
  parseOfficeContactsSnapshot,
  type OfficeContactsMutation,
  type OfficeContactsSnapshot,
} from "@diarydock/office";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

type WithoutRevision<T> = T extends unknown ? Omit<T, "revision"> : never;
export type OfficeContactsDraftMutation = WithoutRevision<OfficeContactsMutation>;

export class OfficeContactsConflictError extends Error {
  readonly snapshot: OfficeContactsSnapshot;

  constructor(message: string, snapshot: OfficeContactsSnapshot) {
    super(message);
    this.name = "OfficeContactsConflictError";
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
    new URL("/api/mobile/office/contacts", getSecureRuntime().apiOrigin),
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
    throw new OfficeContactsConflictError(
      errorMessage(payload, "Office contacts changed on another device."),
      parseOfficeContactsSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(errorMessage(payload, "Office contacts are unavailable."));
  return parseOfficeContactsSnapshot(payload);
}

export function loadMobileOfficeContacts(accessToken: string) {
  return request(accessToken);
}

export async function loadMobileOfficeContactDetail(accessToken: string, contactId: string) {
  const url = new URL("/api/mobile/office/contacts", getSecureRuntime().apiOrigin);
  url.searchParams.set("contactId", contactId);
  const response = await fetch(url, { cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(20_000) });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, response.status === 404
    ? "That contact is no longer available." : "Contact details are unavailable."));
  return parseOfficeContactDetail(payload);
}

export function mutateMobileOfficeContacts(
  accessToken: string,
  mutation: OfficeContactsDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
