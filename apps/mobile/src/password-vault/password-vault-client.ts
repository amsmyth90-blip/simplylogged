import { parseVaultSnapshot, type EncryptedVaultEntry, type VaultSetup } from "@diarydock/password-vault";
import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

type Mutation =
  | { action: "SETUP"; setup: VaultSetup }
  | { action: "PUT_ENTRY"; entry: EncryptedVaultEntry; expectedRevision: number }
  | { action: "DELETE_ENTRY"; id: string; expectedRevision: number };

async function request(accessToken: string, body?: Mutation) {
  if (accessToken.length < 20) throw new Error("Please sign in again.");
  const response = await fetch(new URL("/api/password-vault", getSecureRuntime().apiOrigin), {
    method: body ? "POST" : "GET",
    cache: "no-store",
    signal: requestDeadline(30_000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = (await readBoundedJsonResponse(response, 34 * 1024 * 1024)) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(typeof value.error === "string" ? value.error : "Password Vault is unavailable.");
  const snapshot = parseVaultSnapshot(value.snapshot);
  if (!snapshot) throw new Error("Password Vault returned invalid data.");
  return snapshot;
}

export const loadMobilePasswordVault = (token: string) => request(token);
export const setupMobilePasswordVault = (token: string, setup: VaultSetup) =>
  request(token, { action: "SETUP", setup });
export const saveMobilePasswordVaultEntry = (
  token: string,
  entry: EncryptedVaultEntry,
  expectedRevision: number,
) => request(token, { action: "PUT_ENTRY", entry, expectedRevision });
export const removeMobilePasswordVaultEntry = (token: string, id: string, expectedRevision: number) =>
  request(token, { action: "DELETE_ENTRY", id, expectedRevision });
