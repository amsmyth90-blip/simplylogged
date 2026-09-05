import {
  parseOnboardingMutation,
  parseOnboardingSnapshot,
  type OnboardingMutation,
  type OnboardingSnapshot,
} from "@diarydock/onboarding";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function headers(accessToken: string) {
  if (accessToken.length < 20) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}
async function body(response: Response) { return readBoundedJsonResponse(response, 32 * 1024); }

async function request(url: URL, init: RequestInit, signal: AbortSignal) {
  try {
    return await fetch(url, { ...init, signal });
  } catch {
    throw new Error("DiaryDock could not reach its secure service. Check your connection and try again.");
  }
}

export class OnboardingConflictError extends Error {
  constructor(readonly snapshot: OnboardingSnapshot) {
    super("Setup changed on another device. The latest choices are now shown.");
  }
}

export async function loadMobileOnboarding(accessToken: string) {
  const response = await request(new URL("/api/mobile/onboarding", getSecureRuntime().apiOrigin), {
    headers: headers(accessToken), cache: "no-store" }, requestDeadline(20_000));
  const value = await body(response);
  if (!response.ok) throw new Error("Your DiaryDock setup could not be refreshed.");
  return parseOnboardingSnapshot(value);
}

export async function saveMobileOnboarding(accessToken: string, mutation: OnboardingMutation) {
  const safeMutation = parseOnboardingMutation(mutation);
  const response = await request(new URL("/api/mobile/onboarding", getSecureRuntime().apiOrigin), {
    method: "POST", headers: headers(accessToken), body: JSON.stringify(safeMutation),
  }, requestDeadline(20_000));
  const value = await body(response);
  if (response.status === 409 && value && typeof value === "object" && "snapshot" in value) {
    try { throw new OnboardingConflictError(parseOnboardingSnapshot(value.snapshot)); }
    catch (error) { if (error instanceof OnboardingConflictError) throw error; }
  }
  if (!response.ok) throw new Error("Your DiaryDock setup could not be saved.");
  return parseOnboardingSnapshot(value);
}
