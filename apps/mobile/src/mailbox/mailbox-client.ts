import { parseMailboxSnapshot, type MailboxAction, type MailboxSnapshot } from "@diarydock/mailbox";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export class MailboxConflictError extends Error {
  readonly snapshot: MailboxSnapshot;
  constructor(snapshot: MailboxSnapshot) {
    super("That Mailbox item changed on another device.");
    this.name = "MailboxConflictError";
    this.snapshot = snapshot;
  }
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function message(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.length <= 240 ? error : fallback;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/mailbox", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    signal: requestDeadline(20_000),
  });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (response.status === 409 && payload && typeof payload === "object"
    && !Array.isArray(payload) && "snapshot" in payload) {
    throw new MailboxConflictError(parseMailboxSnapshot(
      (payload as Record<string, unknown>).snapshot,
    ));
  }
  if (!response.ok) throw new Error(message(payload, "Mailbox is unavailable."));
  return parseMailboxSnapshot(payload);
}

export function loadMobileMailbox(accessToken: string) { return request(accessToken); }

export function routeMobileMailboxItem(accessToken: string, input: {
  action: MailboxAction; itemId: string; itemRevision: string;
}) {
  return request(accessToken, { method: "POST", body: JSON.stringify({
    operation: "ROUTE_ITEM", ...input,
  }) });
}
