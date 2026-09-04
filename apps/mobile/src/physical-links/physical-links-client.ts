import {
  parsePhysicalAssetDetail,
  parsePhysicalLinksMutationResponse,
  parsePhysicalLinksSnapshot,
  type PhysicalLinksMutation,
  type PhysicalLinksMutationResponse,
  type PhysicalLinksSnapshot,
} from "@diarydock/physical-links";
import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

type WithoutRevision<Value> = Value extends unknown ? Omit<Value, "revision"> : never;
export type PhysicalLinksDraftMutation = WithoutRevision<PhysicalLinksMutation>;

function headers(accessToken: string) {
  if (accessToken.length < 20) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

async function body(response: Response) {
  return readBoundedJsonResponse(response, 512 * 1024);
}

export class PhysicalLinksConflictError extends Error {
  constructor(readonly snapshot: PhysicalLinksSnapshot) {
    super("Physical Links changed on another device. The latest copy is now shown.");
  }
}

export async function loadMobilePhysicalLinks(accessToken: string) {
  const response = await fetch(new URL("/api/physical-links", getSecureRuntime().apiOrigin), {
    headers: headers(accessToken), signal: requestDeadline(20_000), cache: "no-store",
  });
  const value = await body(response);
  if (!response.ok) throw new Error("Physical Links could not be refreshed.");
  return parsePhysicalLinksSnapshot(value);
}

export async function loadMobilePhysicalAsset(accessToken: string, assetId: string) {
  const url = new URL("/api/physical-links", getSecureRuntime().apiOrigin);
  url.searchParams.set("assetId", assetId);
  const response = await fetch(url, { headers: headers(accessToken),
    signal: requestDeadline(20_000), cache: "no-store" });
  const value = await body(response);
  if (!response.ok) throw new Error(response.status === 404
    ? "That household item is no longer available."
    : "The full household item could not be opened.");
  return parsePhysicalAssetDetail(value);
}

export async function mutateMobilePhysicalLinks(accessToken: string,
  mutation: PhysicalLinksDraftMutation, revision: string): Promise<PhysicalLinksMutationResponse> {
  const response = await fetch(new URL("/api/physical-links", getSecureRuntime().apiOrigin), {
    method: "POST", headers: headers(accessToken), signal: requestDeadline(20_000),
    body: JSON.stringify({ ...mutation, revision }),
  });
  const value = await body(response);
  if (response.status === 409 && value && typeof value === "object" && "snapshot" in value) {
    try { throw new PhysicalLinksConflictError(parsePhysicalLinksSnapshot(value.snapshot)); }
    catch (error) { if (error instanceof PhysicalLinksConflictError) throw error; }
  }
  if (!response.ok) throw new Error("That Physical Links change could not be saved.");
  return parsePhysicalLinksMutationResponse(value);
}
