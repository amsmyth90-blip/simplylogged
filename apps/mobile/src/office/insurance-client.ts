import {
  parseOfficeInsuranceDetail,
  parseOfficeInsuranceSnapshot,
  type OfficeInsuranceMutation,
  type OfficeInsuranceSnapshot,
} from "@diarydock/office";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

type WithoutRevision<Mutation> = Mutation extends unknown
  ? Omit<Mutation, "revision">
  : never;
export type OfficeInsuranceDraftMutation = WithoutRevision<OfficeInsuranceMutation>;

export class OfficeInsuranceConflictError extends Error {
  readonly snapshot: OfficeInsuranceSnapshot;

  constructor(message: string, snapshot: OfficeInsuranceSnapshot) {
    super(message);
    this.name = "OfficeInsuranceConflictError";
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
    new URL("/api/mobile/office/insurance", getSecureRuntime().apiOrigin),
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
    throw new OfficeInsuranceConflictError(
      errorMessage(payload, "Office insurance changed on another device."),
      parseOfficeInsuranceSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, "Office insurance is unavailable."));
  }
  return parseOfficeInsuranceSnapshot(payload);
}

export function loadMobileOfficeInsurance(accessToken: string) {
  return request(accessToken);
}

export async function loadMobileOfficeInsuranceDetail(accessToken: string,
  resourceType: "POLICY" | "CLAIM", resourceId: string) {
  const url = new URL("/api/mobile/office/insurance", getSecureRuntime().apiOrigin);
  url.searchParams.set("resourceType", resourceType);
  url.searchParams.set("resourceId", resourceId);
  const response = await fetch(url, { cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(20_000) });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, response.status === 404
    ? "That insurance record is no longer available." : "Insurance details are unavailable."));
  return parseOfficeInsuranceDetail(payload);
}

export function mutateMobileOfficeInsurance(
  accessToken: string,
  mutation: OfficeInsuranceDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
