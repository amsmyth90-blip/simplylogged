import assert from "node:assert/strict";
import test from "node:test";
import { createVault, encryptCredential, type PasswordVaultSnapshot } from "@diarydock/password-vault";
import { VaultSession, type VaultTransport } from "@diarydock/password-vault/session";

const accountId = "17846255-1b1a-4a2f-9df0-332bb4e5f213";
const passphrase = "correct horse battery staple";
const credential = {
  id: "f7c0c14f-2491-4cb8-a935-900123ec18af",
  name: "Synthetic login",
  username: "qa@example.test",
  password: "Synthetic secret",
  website: "",
  notes: "",
  createdAt: "2026-09-12T12:00:00.000Z",
  updatedAt: "2026-09-12T12:00:00.000Z",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function fixture() {
  const vault = await createVault(accountId, passphrase);
  const entry = await encryptCredential(accountId, credential, vault.masterKey);
  const snapshot = { setup: vault.setup, entries: [entry] };
  const transport: VaultTransport = {
    load: async () => snapshot,
    setup: async () => snapshot,
    save: async () => snapshot,
    remove: async () => ({ ...snapshot, entries: [] }),
  };
  return { snapshot, transport };
}

test("an unlock completing after lock cannot repopulate decrypted memory", async () => {
  const { snapshot, transport } = await fixture();
  const delayed = deferred<PasswordVaultSnapshot>();
  transport.load = () => delayed.promise;
  const session = new VaultSession(accountId, transport);
  const result = session.open(passphrase);
  session.lock();
  delayed.resolve(snapshot);
  await assert.rejects(result, /locked/iu);
  assert.equal(session.getSnapshot().unlocked, false);
  assert.deepEqual(session.getSnapshot().credentials, []);
});

test("a save completing after lock cannot restore an open editor's secrets", async () => {
  const { snapshot, transport } = await fixture();
  const delayed = deferred<PasswordVaultSnapshot>();
  const started = deferred<void>();
  transport.save = () => {
    started.resolve();
    return delayed.promise;
  };
  const session = new VaultSession(accountId, transport);
  await session.open(passphrase);
  const draft = { id: credential.id, name: credential.name, username: credential.username,
    password: credential.password, website: credential.website, notes: credential.notes };
  const result = session.save(draft);
  await started.promise;
  session.lock();
  delayed.resolve(snapshot);
  await assert.rejects(result, /locked/iu);
  assert.equal(session.getSnapshot().unlocked, false);
  assert.deepEqual(session.getSnapshot().credentials, []);
});

test("unlock refreshes other-device changes and concurrent operations are refused", async () => {
  const { snapshot, transport } = await fixture();
  const session = new VaultSession(accountId, transport);
  await session.open(passphrase);
  assert.equal(session.getSnapshot().credentials.length, 1);
  session.lock();
  const delayed = deferred<PasswordVaultSnapshot>();
  transport.load = () => delayed.promise;
  const opening = session.open(passphrase);
  await assert.rejects(session.open(passphrase), /wait/iu);
  delayed.resolve({ ...snapshot, entries: [] });
  await opening;
  assert.equal(session.getSnapshot().credentials.length, 0);
});
