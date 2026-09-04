import {
  parseSyncPullResponse,
  parseSyncPushResponse,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
} from "@diarydock/contracts";

import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

import { readSyncResponseJson } from "./response-json";
import { SyncTransportError } from "./transport-error";

export { SyncTransportError } from "./transport-error";

function retryAfter(response: Response) {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value >= 1 && value <= 3_600 ? Math.ceil(value) : null;
}

function headers(accessToken: string, hasBody = false) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new SyncTransportError("Authentication is required for sync.", 401, null);
  }
  const values: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (hasBody) values["Content-Type"] = "application/json";
  return values;
}

async function checkedResponse(response: Response) {
  if (response.ok) return readSyncResponseJson(response);
  const message = response.status === 401
    ? "Please sign in again to synchronise DiaryDock."
    : "DiaryDock could not synchronise. It will try again.";
  throw new SyncTransportError(message, response.status, retryAfter(response));
}

export class HttpSyncClient {
  private readonly apiOrigin = getSecureRuntime().apiOrigin;

  async pull(accessToken: string, cursor: string | null): Promise<SyncPullResponse> {
    const url = new URL("/api/sync/pull", this.apiOrigin);
    if (cursor) url.searchParams.set("cursor", cursor);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers(accessToken),
        redirect: "error",
        signal: requestDeadline(20_000),
      });
      return parseSyncPullResponse(await checkedResponse(response));
    } catch (error) {
      if (error instanceof SyncTransportError) throw error;
      throw new SyncTransportError("DiaryDock is offline. Changes remain safely on this device.", null, null);
    }
  }

  async push(accessToken: string, request: SyncPushRequest): Promise<SyncPushResponse> {
    const body = JSON.stringify(request);
    if (new TextEncoder().encode(body).byteLength > 512 * 1024) {
      throw new SyncTransportError("The sync batch is too large.", 413, null);
    }
    try {
      const response = await fetch(new URL("/api/sync/push", this.apiOrigin), {
        method: "POST",
        headers: headers(accessToken, true),
        body,
        redirect: "error",
        signal: requestDeadline(20_000),
      });
      return parseSyncPushResponse(await checkedResponse(response));
    } catch (error) {
      if (error instanceof SyncTransportError) throw error;
      throw new SyncTransportError("DiaryDock is offline. Changes remain safely on this device.", null, null);
    }
  }
}
