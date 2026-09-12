import assert from "node:assert/strict";
import test from "node:test";
import {
  createVault,
  decryptCredential,
  encryptCredential,
  generatePassword,
  parseEncryptedEntry,
  parseVaultSetup,
  unlockVault,
  type VaultCredential,
} from "@diarydock/password-vault";

const accountId = "17846255-1b1a-4a2f-9df0-332bb4e5f213";
const otherAccountId = "d22ef030-b185-4ccf-ac81-55721c2f54c6";
const passphrase = "correct horse battery staple";
const credential: VaultCredential = {
  id: "f7c0c14f-2491-4cb8-a935-900123ec18af",
  name: "Private Bank",
  username: "amy@example.test",
  password: "S3cret! value",
  website: "https://example.test",
  notes: "Recovery words are elsewhere.",
  createdAt: "2026-09-12T12:00:00.000Z",
  updatedAt: "2026-09-12T12:00:00.000Z",
};

test("vault setup and credential data round-trip without plaintext leakage", async () => {
  const created = await createVault(accountId, passphrase);
  assert.ok(parseVaultSetup(created.setup));
  const encrypted = await encryptCredential(accountId, credential, created.masterKey);
  const wire = JSON.stringify({ setup: created.setup, encrypted });
  for (const secret of [credential.name, credential.username, credential.password, credential.notes])
    assert.equal(wire.includes(secret), false);
  const reopened = await unlockVault(accountId, passphrase, created.setup);
  assert.deepEqual(await decryptCredential(accountId, encrypted, reopened), credential);
  await assert.rejects(crypto.subtle.exportKey("raw", reopened), /extractable|key/iu);
});

test("wrong passphrases and cross-account key movement fail authentication", async () => {
  const created = await createVault(accountId, passphrase);
  await assert.rejects(
    unlockVault(accountId, "this is definitely the wrong passphrase", created.setup),
    /not correct/iu,
  );
  await assert.rejects(unlockVault(otherAccountId, passphrase, created.setup), /not correct/iu);
});

test("entry tampering and record movement fail authentication", async () => {
  const created = await createVault(accountId, passphrase);
  const encrypted = await encryptCredential(accountId, credential, created.masterKey);
  const final = encrypted.ciphertext.at(-1) === "A" ? "B" : "A";
  await assert.rejects(
    decryptCredential(
      accountId,
      { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -1) + final },
      created.masterKey,
    ),
    /authenticated/iu,
  );
  await assert.rejects(decryptCredential(otherAccountId, encrypted, created.masterKey), /authenticated/iu);
  await assert.rejects(
    decryptCredential(accountId, { ...encrypted, id: otherAccountId }, created.masterKey),
    /authenticated/iu,
  );
});

test("generated passwords include every character class", () => {
  const password = generatePassword(32);
  assert.equal(password.length, 32);
  assert.match(password, /[a-z]/u);
  assert.match(password, /[A-Z]/u);
  assert.match(password, /[0-9]/u);
  assert.match(password, /[^A-Za-z0-9]/u);
  assert.throws(() => generatePassword(8), /between 16 and 128/iu);
});

test("wire parsers reject extra plaintext and invalid metadata", async () => {
  const created = await createVault(accountId, passphrase);
  const encrypted = await encryptCredential(accountId, credential, created.masterKey);
  assert.equal(parseVaultSetup({ ...created.setup, passphrase }), null);
  assert.equal(parseEncryptedEntry({ ...encrypted, password: credential.password }), null);
  assert.equal(parseEncryptedEntry({ ...encrypted, nonce: "not_base64!" }), null);
});
