import { argon2id } from "hash-wasm";
import { decodeBase64Url, decodeUtf8, encodeBase64Url, utf8 } from "./encoding.ts";
import {
  KDF_DEFAULTS,
  parseCredential,
  type EncryptedVaultEntry,
  type VaultCredential,
  type VaultSetup,
} from "./model.ts";

const subtle = () => {
  if (!globalThis.crypto?.subtle) throw new Error("Secure encryption is unavailable on this device.");
  return globalThis.crypto.subtle;
};
const random = (length: number) => globalThis.crypto.getRandomValues(new Uint8Array(length));
const buffer = (value: Uint8Array) => value as unknown as BufferSource;
const keyAad = (accountId: string) => utf8(`diarydock-password-vault:key:v1:${accountId}`);
const entryAad = (accountId: string, entryId: string) =>
  utf8(`diarydock-password-vault:entry:v1:${accountId}:${entryId}`);

function validatePassphrase(passphrase: string) {
  const size = utf8(passphrase).byteLength;
  if (passphrase.length < 15) throw new Error("Use a vault passphrase with at least 15 characters.");
  if (size > 1024) throw new Error("The vault passphrase is too long.");
}

async function deriveKey(passphrase: string, setup: Pick<VaultSetup, "kdf">) {
  validatePassphrase(passphrase);
  const derived = await argon2id({
    password: passphrase,
    salt: decodeBase64Url(setup.kdf.salt),
    parallelism: setup.kdf.parallelism,
    iterations: setup.kdf.iterations,
    memorySize: setup.kdf.memoryKib,
    hashLength: 32,
    outputType: "binary",
  });
  try {
    return await subtle().importKey("raw", buffer(derived), "AES-GCM", false, ["encrypt", "decrypt"]);
  } finally {
    derived.fill(0);
  }
}

export async function createVault(accountId: string, passphrase: string) {
  validatePassphrase(passphrase);
  const salt = random(16),
    rawMasterKey = random(32),
    nonce = random(12);
  const kdf = { name: "argon2id" as const, salt: encodeBase64Url(salt), ...KDF_DEFAULTS };
  const wrappingKey = await deriveKey(passphrase, { kdf });
  try {
    const ciphertext = await subtle().encrypt(
      { name: "AES-GCM", iv: buffer(nonce), additionalData: buffer(keyAad(accountId)), tagLength: 128 },
      wrappingKey,
      buffer(rawMasterKey),
    );
    const masterKey = await subtle().importKey("raw", buffer(rawMasterKey), "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    const setup: VaultSetup = {
      version: 1,
      kdf,
      wrappedKey: {
        algorithm: "AES-256-GCM",
        nonce: encodeBase64Url(nonce),
        ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
      },
      revision: 1,
    };
    return { setup, masterKey };
  } finally {
    rawMasterKey.fill(0);
  }
}

export async function unlockVault(accountId: string, passphrase: string, setup: VaultSetup) {
  const wrappingKey = await deriveKey(passphrase, setup);
  let raw: ArrayBuffer;
  try {
    raw = await subtle().decrypt(
      {
        name: "AES-GCM",
        iv: buffer(decodeBase64Url(setup.wrappedKey.nonce)),
        additionalData: buffer(keyAad(accountId)),
        tagLength: 128,
      },
      wrappingKey,
      buffer(decodeBase64Url(setup.wrappedKey.ciphertext)),
    );
  } catch {
    throw new Error("That vault passphrase is not correct.");
  }
  const bytes = new Uint8Array(raw);
  try {
    return await subtle().importKey("raw", buffer(bytes), "AES-GCM", false, ["encrypt", "decrypt"]);
  } finally {
    bytes.fill(0);
  }
}

export async function encryptCredential(
  accountId: string,
  credential: VaultCredential,
  masterKey: CryptoKey,
  revision = 1,
): Promise<EncryptedVaultEntry> {
  if (!parseCredential(credential)) throw new Error("Invalid credential fields.");
  const nonce = random(12);
  const plaintext = utf8(JSON.stringify(credential));
  try {
    const encrypted = await subtle().encrypt(
      {
        name: "AES-GCM",
        iv: buffer(nonce),
        additionalData: buffer(entryAad(accountId, credential.id)),
        tagLength: 128,
      },
      masterKey,
      buffer(plaintext),
    );
    return {
      id: credential.id,
      version: 1,
      nonce: encodeBase64Url(nonce),
      ciphertext: encodeBase64Url(new Uint8Array(encrypted)),
      revision,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptCredential(accountId: string, entry: EncryptedVaultEntry, masterKey: CryptoKey) {
  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle().decrypt(
      {
        name: "AES-GCM",
        iv: buffer(decodeBase64Url(entry.nonce)),
        additionalData: buffer(entryAad(accountId, entry.id)),
        tagLength: 128,
      },
      masterKey,
      buffer(decodeBase64Url(entry.ciphertext)),
    );
  } catch {
    throw new Error("This vault item could not be authenticated.");
  }
  const bytes = new Uint8Array(plaintext);
  try {
    const credential = parseCredential(JSON.parse(decodeUtf8(bytes)));
    if (!credential || credential.id !== entry.id) throw new Error("Invalid vault item.");
    return credential;
  } finally {
    bytes.fill(0);
  }
}
