export const VAULT_VERSION = 1 as const;
export const KDF_DEFAULTS = { memoryKib: 19_456, iterations: 2, parallelism: 1 } as const;

export type VaultSetup = {
  version: 1;
  kdf: { name: "argon2id"; salt: string; memoryKib: number; iterations: number; parallelism: number };
  wrappedKey: { algorithm: "AES-256-GCM"; nonce: string; ciphertext: string };
  revision: number;
};

export type EncryptedVaultEntry = {
  id: string;
  version: 1;
  nonce: string;
  ciphertext: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type VaultCredential = {
  id: string;
  name: string;
  username: string;
  password: string;
  website: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PasswordVaultSnapshot = { setup: VaultSetup | null; entries: EncryptedVaultEntry[] };

const text = (value: unknown, maximum: number) =>
  typeof value === "string" && value.length <= maximum ? value : null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => key in value);
const isIsoDate = (value: string) => {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
};
const integer = (value: unknown, minimum: number, maximum: number) =>
  Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null;

export function parseVaultSetup(value: unknown): VaultSetup | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const kdf = row.kdf as Record<string, unknown> | undefined;
  const wrapped = row.wrappedKey as Record<string, unknown> | undefined;
  const salt = text(kdf?.salt, 128),
    nonce = text(wrapped?.nonce, 128),
    ciphertext = text(wrapped?.ciphertext, 1024);
  const memoryKib = integer(kdf?.memoryKib, 19_456, 262_144);
  const iterations = integer(kdf?.iterations, 2, 10),
    parallelism = integer(kdf?.parallelism, 1, 4);
  const revision = integer(row.revision, 1, Number.MAX_SAFE_INTEGER);
  if (
    !exactKeys(row, ["version", "kdf", "wrappedKey", "revision"]) ||
    !kdf ||
    !wrapped ||
    !exactKeys(kdf, ["name", "salt", "memoryKib", "iterations", "parallelism"]) ||
    !exactKeys(wrapped, ["algorithm", "nonce", "ciphertext"]) ||
    row.version !== 1 ||
    kdf.name !== "argon2id" ||
    wrapped.algorithm !== "AES-256-GCM" ||
    !salt ||
    salt.length !== 22 ||
    !nonce ||
    nonce.length !== 16 ||
    !ciphertext ||
    ciphertext.length !== 64 ||
    !BASE64URL.test(salt) ||
    !BASE64URL.test(nonce) ||
    !BASE64URL.test(ciphertext) ||
    !memoryKib ||
    !iterations ||
    !parallelism ||
    !revision
  )
    return null;
  return {
    version: 1,
    kdf: { name: "argon2id", salt, memoryKib, iterations, parallelism },
    wrappedKey: { algorithm: "AES-256-GCM", nonce, ciphertext },
    revision,
  };
}

export function parseEncryptedEntry(value: unknown): EncryptedVaultEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id, 64),
    nonce = text(row.nonce, 128),
    ciphertext = text(row.ciphertext, 65_536);
  const createdAt = text(row.createdAt, 64),
    updatedAt = text(row.updatedAt, 64);
  const revision = integer(row.revision, 1, Number.MAX_SAFE_INTEGER);
  if (
    !exactKeys(row, ["id", "version", "nonce", "ciphertext", "revision", "createdAt", "updatedAt"]) ||
    !id ||
    !UUID.test(id) ||
    row.version !== 1 ||
    !nonce ||
    nonce.length !== 16 ||
    !ciphertext ||
    !BASE64URL.test(nonce) ||
    !BASE64URL.test(ciphertext) ||
    !revision ||
    !createdAt ||
    !updatedAt ||
    !isIsoDate(createdAt) ||
    !isIsoDate(updatedAt)
  )
    return null;
  return { id, version: 1, nonce, ciphertext, revision, createdAt, updatedAt };
}

export function parseCredential(value: unknown): VaultCredential | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id, 64),
    name = text(row.name, 160),
    username = text(row.username, 512);
  const password = text(row.password, 2048),
    website = text(row.website, 2048),
    notes = text(row.notes, 8192);
  const createdAt = text(row.createdAt, 64),
    updatedAt = text(row.updatedAt, 64);
  if (
    !exactKeys(row, ["id", "name", "username", "password", "website", "notes", "createdAt", "updatedAt"]) ||
    !id ||
    !UUID.test(id) ||
    !name?.trim() ||
    username === null ||
    password === null ||
    website === null ||
    notes === null ||
    !createdAt ||
    !updatedAt ||
    !isIsoDate(createdAt) ||
    !isIsoDate(updatedAt)
  )
    return null;
  return { id, name: name.trim(), username, password, website, notes, createdAt, updatedAt };
}

export function parseVaultSnapshot(value: unknown): PasswordVaultSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!exactKeys(row, ["setup", "entries"])) return null;
  const setup = row.setup === null ? null : parseVaultSetup(row.setup);
  if ((row.setup !== null && !setup) || !Array.isArray(row.entries) || row.entries.length > 500) return null;
  const entries = row.entries.map(parseEncryptedEntry);
  if (entries.some((entry) => !entry)) return null;
  return { setup, entries: entries as EncryptedVaultEntry[] };
}
