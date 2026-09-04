import {
  parseOfficeBillDetail,
  parseOfficeBillsSnapshot,
  type OfficeBillMutation,
  type OfficeBillsSnapshot,
} from "@diarydock/office";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type OfficeBillDraftMutation = Omit<OfficeBillMutation, "revision">;

export class OfficeBillsConflictError extends Error {
  readonly snapshot: OfficeBillsSnapshot;

  constructor(message: string, snapshot: OfficeBillsSnapshot) {
    super(message);
    this.name = "OfficeBillsConflictError";
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
    new URL("/api/mobile/office/bills", getSecureRuntime().apiOrigin),
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
    throw new OfficeBillsConflictError(
      errorMessage(payload, "Office bills changed on another device."),
      parseOfficeBillsSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(errorMessage(payload, "Office bills are unavailable."));
  return parseOfficeBillsSnapshot(payload);
}

export function loadMobileOfficeBills(accessToken: string) {
  return request(accessToken);
}

export async function loadMobileOfficeBillDetail(accessToken: string, billId: string) {
  const url = new URL("/api/mobile/office/bills", getSecureRuntime().apiOrigin);
  url.searchParams.set("billId", billId);
  const response = await fetch(url, { cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(20_000) });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, response.status === 404
    ? "That bill is no longer available." : "Bill details are unavailable."));
  return parseOfficeBillDetail(payload);
}

export function mutateMobileOfficeBill(
  accessToken: string,
  mutation: OfficeBillDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
