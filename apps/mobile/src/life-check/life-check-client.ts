import {
  parseLifeCheckSnapshot,
  type LifeCheckMutation,
  type LifeCheckSnapshot,
} from "@diarydock/life-check";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function headers(accessToken: string) {
  if (accessToken.length < 20) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}
async function body(response: Response) { return readBoundedJsonResponse(response, 64 * 1024); }

export class LifeCheckConflictError extends Error {
  constructor(readonly snapshot: LifeCheckSnapshot) {
    super("Life Check changed on another device. The latest answers are now shown.");
  }
}

export async function loadMobileLifeCheck(accessToken: string) {
  const response = await fetch(new URL("/api/mobile/life-check", getSecureRuntime().apiOrigin), {
    headers: headers(accessToken), signal: requestDeadline(20_000), cache: "no-store" });
  const value = await body(response);
  if (!response.ok) throw new Error("Life Check could not be refreshed.");
  return parseLifeCheckSnapshot(value);
}

export async function updateMobileLifeCheck(accessToken: string, mutation: LifeCheckMutation) {
  const response = await fetch(new URL("/api/mobile/life-check", getSecureRuntime().apiOrigin), {
    method: "POST", headers: headers(accessToken), signal: requestDeadline(20_000),
    body: JSON.stringify(mutation) });
  const value = await body(response);
  if (response.status === 409 && value && typeof value === "object" && "snapshot" in value) {
    try { throw new LifeCheckConflictError(parseLifeCheckSnapshot(value.snapshot)); }
    catch (error) { if (error instanceof LifeCheckConflictError) throw error; }
  }
  if (!response.ok) throw new Error("That Life Check answer could not be saved.");
  return parseLifeCheckSnapshot(value);
}
