import { parseVaultSnapshot, type EncryptedVaultEntry, type VaultSetup } from "@diarydock/password-vault";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";

type Mutation =
  | { action: "SETUP"; setup: VaultSetup }
  | { action: "PUT_ENTRY"; entry: EncryptedVaultEntry; expectedRevision: number }
  | { action: "DELETE_ENTRY"; id: string; expectedRevision: number };

async function request(accountId: string, body?: Mutation) {
  const response = await fetch("/api/password-vault", {
    method: body ? "POST" : "GET",
    headers: { "X-DiaryDock-Account": accountId, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const value = await readBoundedJsonResponse(response, 34 * 1024 * 1024);
  if (!value || typeof value !== "object") throw new Error("Invalid vault response.");
  const result = value as Record<string, unknown>;
  if (!response.ok)
    throw new Error(typeof result.error === "string" ? result.error : "Password Vault is unavailable.");
  const snapshot = parseVaultSnapshot(result.snapshot);
  if (!snapshot) throw new Error("Password Vault returned invalid data.");
  return snapshot;
}

export function webVaultTransport(accountId: string) {
  return {
    load: () => request(accountId),
    setup: (setup: VaultSetup) => request(accountId, { action: "SETUP", setup }),
    save: (entry: EncryptedVaultEntry, expectedRevision: number) =>
      request(accountId, { action: "PUT_ENTRY", entry, expectedRevision }),
    remove: (id: string, expectedRevision: number) =>
      request(accountId, { action: "DELETE_ENTRY", id, expectedRevision }),
  };
}
