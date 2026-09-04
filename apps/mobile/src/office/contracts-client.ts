import {
  parseOfficeContractDetail,
  parseOfficeContractsSnapshot,
  type OfficeContractMutation,
  type OfficeContractsSnapshot,
} from "@diarydock/office";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type OfficeContractDraftMutation = Omit<OfficeContractMutation, "revision">;

export class OfficeContractsConflictError extends Error {
  readonly snapshot: OfficeContractsSnapshot;

  constructor(message: string, snapshot: OfficeContractsSnapshot) {
    super(message);
    this.name = "OfficeContractsConflictError";
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
  const response = await fetch(
    new URL("/api/mobile/office/contracts", getSecureRuntime().apiOrigin),
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
    throw new OfficeContractsConflictError(
      errorMessage(payload, "Office contracts changed on another device."),
      parseOfficeContractsSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(errorMessage(payload, "Office contracts are unavailable."));
  return parseOfficeContractsSnapshot(payload);
}

export function loadMobileOfficeContracts(accessToken: string) {
  return request(accessToken);
}

export async function loadMobileOfficeContractDetail(accessToken: string, contractId: string) {
  const url = new URL("/api/mobile/office/contracts", getSecureRuntime().apiOrigin);
  url.searchParams.set("contractId", contractId);
  const response = await fetch(url, { cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(20_000) });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, response.status === 404
    ? "That contract is no longer available." : "Contract details are unavailable."));
  return parseOfficeContractDetail(payload);
}

export function mutateMobileOfficeContract(
  accessToken: string,
  mutation: OfficeContractDraftMutation,
  revision: string | null,
) {
  return request(accessToken, { method: "POST", body: JSON.stringify({ ...mutation, revision }) });
}
