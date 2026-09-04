import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type MobileSettingsSummary = {
  profile: { name: string; email: string; memberSince: string };
  analytics: { enabled: boolean; retentionDays: number };
  storage: { tier: string; usedBytes: number; reservedBytes: number; limitBytes: number } | null;
  forwarding: { configured: boolean; address?: string };
};

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/settings", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    signal: requestSignal(init?.signal),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await readBoundedJsonResponse(response, 64 * 1024) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Settings could not be updated.");
  return payload;
}

export async function loadMobileSettings(accessToken: string) {
  return await request(accessToken) as MobileSettingsSummary;
}

export async function setMobileAnalytics(accessToken: string, enabled: boolean) {
  return await request(accessToken, {
    method: "POST",
    body: JSON.stringify({ operation: "SET_ANALYTICS", enabled }),
  }) as { enabled: boolean };
}

export async function requestMobileAccountDeletion(accessToken: string, confirmation: string) {
  return await request(accessToken, {
    method: "POST",
    body: JSON.stringify({ operation: "REQUEST_DELETION", confirmation }),
  }) as { message: string; status: string };
}
