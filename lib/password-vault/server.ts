import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseEncryptedEntry,
  parseVaultSetup,
  type EncryptedVaultEntry,
  type PasswordVaultSnapshot,
  type VaultSetup,
} from "@diarydock/password-vault";

type VaultRow = {
  schema_version: number;
  kdf_salt: string;
  kdf_memory_kib: number;
  kdf_iterations: number;
  kdf_parallelism: number;
  wrapped_key_nonce: string;
  wrapped_key_ciphertext: string;
  revision: number;
};
type EntryRow = {
  id: string;
  schema_version: number;
  nonce: string;
  ciphertext: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

function setupFromRow(row: VaultRow | null) {
  if (!row) return null;
  return parseVaultSetup({
    version: row.schema_version,
    kdf: {
      name: "argon2id",
      salt: row.kdf_salt,
      memoryKib: row.kdf_memory_kib,
      iterations: row.kdf_iterations,
      parallelism: row.kdf_parallelism,
    },
    wrappedKey: {
      algorithm: "AES-256-GCM",
      nonce: row.wrapped_key_nonce,
      ciphertext: row.wrapped_key_ciphertext,
    },
    revision: row.revision,
  });
}

function entryFromRow(row: EntryRow) {
  return parseEncryptedEntry({
    id: row.id,
    version: row.schema_version,
    nonce: row.nonce,
    ciphertext: row.ciphertext,
    revision: row.revision,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}

export async function loadPasswordVault(
  admin: SupabaseClient,
  userId: string,
): Promise<PasswordVaultSnapshot> {
  const [vaultResult, entriesResult] = await Promise.all([
    admin
      .from("password_vaults")
      .select(
        "schema_version,kdf_salt,kdf_memory_kib,kdf_iterations,kdf_parallelism,wrapped_key_nonce,wrapped_key_ciphertext,revision",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("password_vault_entries")
      .select("id,schema_version,nonce,ciphertext,revision,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);
  if (vaultResult.error || entriesResult.error) throw new Error("Password vault storage is unavailable.");
  const setup = setupFromRow(vaultResult.data as VaultRow | null);
  const entries = ((entriesResult.data ?? []) as EntryRow[]).map(entryFromRow);
  if ((vaultResult.data && !setup) || entries.some((entry) => !entry))
    throw new Error("Password vault storage returned invalid data.");
  return { setup, entries: entries as EncryptedVaultEntry[] };
}

export async function createPasswordVault(admin: SupabaseClient, userId: string, setup: VaultSetup) {
  const { error } = await admin
    .from("password_vaults")
    .insert({
      user_id: userId,
      schema_version: setup.version,
      kdf_salt: setup.kdf.salt,
      kdf_memory_kib: setup.kdf.memoryKib,
      kdf_iterations: setup.kdf.iterations,
      kdf_parallelism: setup.kdf.parallelism,
      wrapped_key_nonce: setup.wrappedKey.nonce,
      wrapped_key_ciphertext: setup.wrappedKey.ciphertext,
      revision: setup.revision,
    });
  if (!error) return "OK" as const;
  if (error.code === "23505") return "CONFLICT" as const;
  throw new Error("Password vault setup could not be saved.");
}

export async function putPasswordVaultEntry(
  admin: SupabaseClient,
  userId: string,
  entry: EncryptedVaultEntry,
  expectedRevision: number,
) {
  const row = {
    user_id: userId,
    id: entry.id,
    schema_version: entry.version,
    nonce: entry.nonce,
    ciphertext: entry.ciphertext,
    revision: expectedRevision + 1,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
  if (expectedRevision === 0) {
    const { error } = await admin.from("password_vault_entries").insert({ ...row, revision: 1 });
    if (!error) return "OK" as const;
    if (error.code === "23505") return "CONFLICT" as const;
    if (error.code === "54000") return "CAPACITY" as const;
    throw new Error("Password vault item could not be saved.");
  }
  const { data, error } = await admin
    .from("password_vault_entries")
    .update(row)
    .eq("user_id", userId)
    .eq("id", entry.id)
    .eq("revision", expectedRevision)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Password vault item could not be saved.");
  return data ? ("OK" as const) : ("CONFLICT" as const);
}

export async function deletePasswordVaultEntry(
  admin: SupabaseClient,
  userId: string,
  id: string,
  expectedRevision: number,
) {
  const { data, error } = await admin
    .from("password_vault_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .eq("revision", expectedRevision)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Password vault item could not be deleted.");
  return data ? ("OK" as const) : ("CONFLICT" as const);
}
