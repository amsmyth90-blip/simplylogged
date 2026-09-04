import assert from "node:assert/strict";
import test from "node:test";

import { SYNC_API_VERSION, type SyncPushRequest } from "../packages/contracts/src/sync.ts";
import type {
  OfflineStore,
  PendingMutation,
} from "../packages/offline-store/src/types.ts";
import { SyncEngine } from "../apps/mobile/src/sync/sync-engine.ts";
import { syncRetryDelaySeconds } from "../apps/mobile/src/sync/retry-policy.ts";
import { nextBackgroundSyncDelay } from "../apps/mobile/src/sync/sync-schedule.ts";
import { SyncTransportError } from "../apps/mobile/src/sync/transport-error.ts";

const mutation: PendingMutation = {
  sequence: 1,
  idempotencyKey: "ad94c430-4ce0-4b6d-b1e8-f9ad4072ce88",
  recordId: "9e152506-4667-42e8-84df-47a87956aef9",
  entityType: "reminder",
  operation: "UPSERT",
  expectedRevision: null,
  schemaVersion: 1,
  payload: {
    title: "Renew home insurance",
    group: "later",
    timeLabel: "October",
    priority: "normal",
  },
  createdAt: "2026-09-01T10:00:00.000Z",
  attemptCount: 0,
  retryAfter: null,
  state: "QUEUED",
  batchId: null,
  errorCode: null,
};
const householdId = "a62adcc2-c83a-4a91-b00d-dedc0850d672";

function fakeStore(overrides: Partial<OfflineStore> = {}) {
  let claimed = false;
  return {
    initialize: async () => undefined,
    close: async () => undefined,
    clear: async () => undefined,
    getRecord: async () => null,
    listRecords: async () => [],
    stageMutation: async () => mutation,
    claimPendingBatch: async () => claimed ? [] : (claimed = true, [mutation]),
    releasePendingBatch: async () => undefined,
    applyRemoteBatch: async () => undefined,
    applyPushResults: async () => undefined,
    getCursor: async () => null,
    listConflicts: async () => [],
    listFailures: async () => [],
    resolveConflict: async () => undefined,
    ...overrides,
  } satisfies OfflineStore;
}

test("sync pulls, sends a bounded owner-free batch, then checks for remote changes", async () => {
  const requests: SyncPushRequest[] = [];
  let pullCount = 0;
  let appliedBatch = "";
  const appliedScopes: Array<string | null> = [];
  const store = fakeStore({
    applyPushResults: async (batchId) => { appliedBatch = batchId; },
    applyRemoteBatch: async (_records, _cursor, activeHouseholdId) => {
      appliedScopes.push(activeHouseholdId);
    },
  });
  const transport = {
    pull: async () => {
      pullCount += 1;
      return {
        apiVersion: SYNC_API_VERSION,
        records: [],
        nextCursor: "cursor",
        hasMore: false,
        activeHouseholdId: householdId,
      };
    },
    push: async (_token: string, request: SyncPushRequest) => {
      requests.push(request);
      return {
        apiVersion: SYNC_API_VERSION,
        batchId: request.batchId,
        results: [{
          idempotencyKey: mutation.idempotencyKey,
          status: "REJECTED" as const,
          record: null,
          errorCode: "UNSUPPORTED_SCHEMA" as const,
        }],
      };
    },
  };
  const engine = new SyncEngine(store, transport, async () => "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51");
  await engine.synchronize("a".repeat(32));

  assert.equal(pullCount, 2);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.batchId, appliedBatch);
  assert.equal(requests[0]?.deviceId, "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51");
  assert.equal("ownerId" in requests[0]!.mutations[0]!, false);
  assert.deepEqual(appliedScopes, [householdId, householdId]);
});

test("a failed push releases the claimed batch with a bounded retry time", async () => {
  let released: { batchId: string; retryAfter: string | null } | null = null;
  const store = fakeStore({
    releasePendingBatch: async (batchId, retryAfter) => { released = { batchId, retryAfter }; },
  });
  let pullCount = 0;
  const transport = {
    pull: async () => {
      pullCount += 1;
      return {
        apiVersion: SYNC_API_VERSION,
        records: [],
        nextCursor: "cursor",
        hasMore: false,
        activeHouseholdId: null,
      };
    },
    push: async () => {
      throw new SyncTransportError("Retry", 429, 45);
    },
  };
  const engine = new SyncEngine(store, transport, async () => "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51");
  await assert.rejects(() => engine.synchronize("a".repeat(32)), /Retry/);

  assert.equal(pullCount, 1);
  assert.ok(released);
  assert.match(released.retryAfter ?? "", /^\d{4}-\d{2}-\d{2}T/);
});

test("sync retry timing honours the server and adds bounded exponential jitter", () => {
  assert.equal(syncRetryDelaySeconds(new SyncTransportError("Busy", 429, 45), 1), 45);
  assert.equal(syncRetryDelaySeconds(new Error("Offline"), 1, () => 0), 5);
  assert.equal(syncRetryDelaySeconds(new Error("Offline"), 1, () => 1), 10);
  assert.equal(syncRetryDelaySeconds(new Error("Offline"), 20, () => 1), 900);
});

test("background sync is staggered to avoid fleet-wide request spikes", () => {
  assert.equal(nextBackgroundSyncDelay(() => 0), 4 * 60_000);
  assert.equal(nextBackgroundSyncDelay(() => 0.5), 5 * 60_000);
  assert.equal(nextBackgroundSyncDelay(() => 1), 6 * 60_000);
});
