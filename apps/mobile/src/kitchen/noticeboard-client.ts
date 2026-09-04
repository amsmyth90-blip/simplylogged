import {
  parseKitchenNoticeboardSnapshot,
  type KitchenNoticeMutation,
  type KitchenNoticeboardSnapshot,
} from "@diarydock/kitchen";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type NoticeDraftMutation = KitchenNoticeMutation extends infer Mutation
  ? Mutation extends KitchenNoticeMutation ? Omit<Mutation, "revision"> : never
  : never;

export class NoticeboardConflictError extends Error {
  readonly snapshot: KitchenNoticeboardSnapshot;

  constructor(message: string, snapshot: KitchenNoticeboardSnapshot) {
    super(message);
    this.name = "NoticeboardConflictError";
    this.snapshot = snapshot;
  }
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function message(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = (value as Record<string, unknown>).error;
  return typeof candidate === "string" && candidate.length <= 240 ? candidate : fallback;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/kitchen/notices", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    redirect: "error",
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: requestDeadline(30_000),
  }).catch(() => { throw new Error("DiaryDock is offline. Your encrypted noticeboard is still available."); });
  const payload = await readBoundedJsonResponse(response, 256 * 1024);
  if (response.status === 409 && payload && typeof payload === "object"
    && !Array.isArray(payload) && "snapshot" in payload) {
    throw new NoticeboardConflictError(
      message(payload, "The noticeboard changed on another device."),
      parseKitchenNoticeboardSnapshot((payload as Record<string, unknown>).snapshot),
    );
  }
  if (!response.ok) throw new Error(message(payload, "The noticeboard is unavailable."));
  return parseKitchenNoticeboardSnapshot(payload);
}

export function loadMobileNoticeboard(accessToken: string) {
  return request(accessToken);
}

export function mutateMobileNoticeboard(accessToken: string, mutation: NoticeDraftMutation,
  revision: string | null) {
  return request(accessToken, { method: "POST", body: JSON.stringify({ ...mutation, revision }) });
}
