import assert from "node:assert/strict";
import test from "node:test";

import { createOfflineAccountRegistry } from "../apps/mobile/src/auth/offline-account-registry.ts";

const names = {
  alpha: `diarydock_${"a".repeat(24)}`,
  beta: `diarydock_${"b".repeat(24)}`,
};

function harness(initial: string | null = null) {
  let marker = initial;
  const deleted: string[] = [];
  const registry = createOfflineAccountRegistry({
    databaseName: async (accountId) => names[accountId as keyof typeof names],
    deleteDatabase: async (databaseName) => { deleted.push(databaseName); },
    getMarker: async () => marker,
    removeMarker: async () => { marker = null; },
    setMarker: async (value) => { marker = value; },
  });
  return { deleted, marker: () => marker, registry };
}

test("switching accounts removes the previous encrypted database first", async () => {
  const state = harness();
  await state.registry.prepare("alpha");
  await state.registry.prepare("beta");
  assert.deepEqual(state.deleted, [names.alpha]);
  assert.deepEqual(JSON.parse(state.marker() ?? ""), {
    databaseName: names.beta,
    state: "ACTIVE",
  });
});

test("a requested purge is durable and recovered before session startup", async () => {
  const state = harness();
  await state.registry.prepare("alpha");
  await state.registry.requestPurge("alpha");
  assert.equal(JSON.parse(state.marker() ?? "").state, "PURGE_PENDING");
  await state.registry.recoverPendingPurge();
  assert.deepEqual(state.deleted, [names.alpha]);
  assert.equal(state.marker(), null);
});

test("a failed purge retains its retry marker and fails closed", async () => {
  let marker = JSON.stringify({ databaseName: names.alpha, state: "PURGE_PENDING" });
  const registry = createOfflineAccountRegistry({
    databaseName: async () => names.alpha,
    deleteDatabase: async () => { throw new Error("native deletion failed"); },
    getMarker: async () => marker,
    removeMarker: async () => { marker = null; },
    setMarker: async (value) => { marker = value; },
  });
  await assert.rejects(() => registry.recoverPendingPurge(), /native deletion failed/);
  assert.equal(JSON.parse(marker).state, "PURGE_PENDING");
});

test("invalid secure account markers are rejected instead of trusted", async () => {
  const state = harness(JSON.stringify({ databaseName: "other-app", state: "ACTIVE" }));
  await assert.rejects(() => state.registry.prepare("alpha"), /marker is invalid/);
  assert.deepEqual(state.deleted, []);
});
