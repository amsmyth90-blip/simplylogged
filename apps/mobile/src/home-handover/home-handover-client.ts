import {
  parseHomeHandoverDetail,
  parseHomeHandoverSnapshot,
  type HomeHandoverDetailRequest,
  type HomeHandoverMutation,
  type HomeHandoverSnapshot,
} from "@diarydock/home-handover";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function headers(accessToken: string) {
  if (accessToken.length < 20) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}
async function body(response: Response) { return readBoundedJsonResponse(response, 512 * 1024); }

export class HomeHandoverConflictError extends Error {
  constructor(readonly snapshot: HomeHandoverSnapshot) {
    super("Home Handover changed on another device. The latest draft is now shown.");
  }
}

export async function loadMobileHomeHandover(accessToken: string) {
  const response = await fetch(new URL("/api/home-handover", getSecureRuntime().apiOrigin), {
    headers: headers(accessToken), signal: requestDeadline(20_000), cache: "no-store" });
  const value = await body(response);
  if (!response.ok) throw new Error("Home Handover could not be refreshed.");
  return parseHomeHandoverSnapshot(value);
}

export async function loadMobileHomeHandoverDetail(accessToken: string,
  request: HomeHandoverDetailRequest) {
  const url = new URL("/api/home-handover", getSecureRuntime().apiOrigin);
  for (const [key, value] of Object.entries(request)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: headers(accessToken),
    signal: requestDeadline(20_000), cache: "no-store" });
  const value = await body(response);
  if (!response.ok) throw new Error(response.status === 404
    ? "That Home Handover item is no longer available."
    : "The full Home Handover detail could not be opened.");
  return parseHomeHandoverDetail(value);
}

export async function updateMobileHomeHandover(accessToken: string,
  mutation: HomeHandoverMutation) {
  const response = await fetch(new URL("/api/home-handover", getSecureRuntime().apiOrigin), {
    method: "POST", headers: headers(accessToken), signal: requestDeadline(20_000),
    body: JSON.stringify(mutation) });
  const value = await body(response);
  if (response.status === 409 && value && typeof value === "object" && "snapshot" in value) {
    try { throw new HomeHandoverConflictError(parseHomeHandoverSnapshot(value.snapshot)); }
    catch (error) { if (error instanceof HomeHandoverConflictError) throw error; }
  }
  if (!response.ok) {
    const message = value && typeof value === "object" && "error" in value
      ? String(value.error) : "That Home Handover change could not be saved.";
    throw new Error(message);
  }
  return parseHomeHandoverSnapshot(value);
}
