import {
  parseGuardianResponse,
  type GuardianDecision,
} from "@diarydock/guardian";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

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
  const response = await fetch(new URL("/api/mobile/guardian", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    signal: requestSignal(init?.signal),
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = await readBoundedJsonResponse(response, 96 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, "Guardian is unavailable."));
  return payload;
}

export async function loadMobileGuardian(accessToken: string) {
  return parseGuardianResponse(await request(accessToken));
}

export async function decideMobileGuardian(
  accessToken: string,
  findingId: string,
  decision: GuardianDecision,
) {
  const payload = await request(accessToken, {
    method: "POST",
    body: JSON.stringify({ findingId, decision }),
  });
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || (payload as Record<string, unknown>).ok !== true
    || Object.keys(payload).some((key) => key !== "ok")) {
    throw new Error("Guardian returned an invalid update.");
  }
}
