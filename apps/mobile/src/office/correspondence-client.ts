import {
  parseOfficeCorrespondenceDetail,
  parseOfficeCorrespondenceSnapshot,
  type OfficeCorrespondenceMutation,
  type OfficeCorrespondenceSnapshot,
} from "@diarydock/office";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type OfficeCorrespondenceDraftMutation = Omit<OfficeCorrespondenceMutation, "revision">;

export class OfficeCorrespondenceConflictError extends Error {
  readonly snapshot: OfficeCorrespondenceSnapshot;

  constructor(message: string, snapshot: OfficeCorrespondenceSnapshot) {
    super(message);
    this.name = "OfficeCorrespondenceConflictError";
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
    new URL("/api/mobile/office/correspondence", getSecureRuntime().apiOrigin),
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
    throw new OfficeCorrespondenceConflictError(
      errorMessage(payload, "Office correspondence changed on another device."),
      parseOfficeCorrespondenceSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, "Office correspondence is unavailable."));
  }
  return parseOfficeCorrespondenceSnapshot(payload);
}

export function loadMobileOfficeCorrespondence(accessToken: string) {
  return request(accessToken);
}

export async function loadMobileOfficeCorrespondenceDetail(accessToken: string,
  correspondenceId: string) {
  const url = new URL("/api/mobile/office/correspondence", getSecureRuntime().apiOrigin);
  url.searchParams.set("correspondenceId", correspondenceId);
  const response = await fetch(url, { cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(20_000) });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, response.status === 404
    ? "That correspondence is no longer available." : "Correspondence details are unavailable."));
  return parseOfficeCorrespondenceDetail(payload);
}

export function mutateMobileOfficeCorrespondence(
  accessToken: string,
  mutation: OfficeCorrespondenceDraftMutation,
  revision: string | null,
) {
  return request(accessToken, {
    method: "POST",
    body: JSON.stringify({ ...mutation, revision }),
  });
}
