import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNC_API_VERSION,
  parseSyncPullResponse,
  parseSyncPushRequest,
} from "../packages/contracts/src/sync.ts";
import { parseSyncPushResponse } from "../packages/contracts/src/sync-push.ts";

const deviceId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const recordId = "9e152506-4667-42e8-84df-47a87956aef9";

test("accepts a bounded versioned sync mutation without client-supplied ownership", () => {
  const parsed = parseSyncPushRequest({
    apiVersion: SYNC_API_VERSION,
    deviceId,
    batchId: "a62adcc2-c83a-4a91-b00d-dedc0850d672",
    mutations: [{
      idempotencyKey: "ad94c430-4ce0-4b6d-b1e8-f9ad4072ce88",
      recordId,
      entityType: "reminder",
      operation: "UPSERT",
      expectedRevision: "14",
      schemaVersion: 1,
      payload: { title: "Renew home insurance", completed: false },
    }],
  });

  assert.equal(parsed.mutations[0]?.recordId, recordId);
  assert.equal("ownerId" in parsed.mutations[0]!, false);
});

test("rejects deletion payloads and oversized mutation batches", () => {
  const deletion = {
    idempotencyKey: "ad94c430-4ce0-4b6d-b1e8-f9ad4072ce88",
    recordId,
    entityType: "reminder",
    operation: "DELETE",
    expectedRevision: "14",
    schemaVersion: 1,
    payload: { ownerId: deviceId },
  };
  assert.throws(() => parseSyncPushRequest({
    apiVersion: SYNC_API_VERSION,
    deviceId,
    batchId: "a62adcc2-c83a-4a91-b00d-dedc0850d672",
    mutations: [deletion],
  }), /must be empty for a deletion/);

  assert.throws(() => parseSyncPushRequest({
    apiVersion: SYNC_API_VERSION,
    deviceId,
    batchId: "a62adcc2-c83a-4a91-b00d-dedc0850d672",
    mutations: Array.from({ length: 101 }, () => ({ ...deletion, payload: {} })),
  }), /at most 100 items/);

  const validMutation = { ...deletion, operation: "UPSERT", payload: {} };
  assert.throws(() => parseSyncPushRequest({
    apiVersion: SYNC_API_VERSION,
    deviceId,
    batchId: "a62adcc2-c83a-4a91-b00d-dedc0850d672",
    mutations: [validMutation, validMutation],
  }), /duplicate idempotency keys/);
});

test("validates pull records and opaque pagination cursors", () => {
  const result = parseSyncPullResponse({
    apiVersion: SYNC_API_VERSION,
    records: [{
      id: recordId,
      entityType: "reminder",
      scope: { kind: "USER", id: deviceId },
      revision: "15",
      schemaVersion: 1,
      updatedAt: "2026-09-01T18:30:00.000Z",
      deletedAt: null,
      payload: { title: "Renew home insurance" },
    }],
    nextCursor: "opaque-next-page",
    hasMore: true,
    activeHouseholdId: deviceId,
  });

  assert.equal(result.records[0]?.scope.kind, "USER");
  assert.equal(result.nextCursor, "opaque-next-page");
  assert.equal(result.activeHouseholdId, deviceId);
});

test("requires a server record for applied and conflicting mutations", () => {
  const response = {
    apiVersion: SYNC_API_VERSION,
    batchId: "a62adcc2-c83a-4a91-b00d-dedc0850d672",
    results: [{
      idempotencyKey: "ad94c430-4ce0-4b6d-b1e8-f9ad4072ce88",
      status: "APPLIED",
      record: null,
      errorCode: null,
    }],
  };
  assert.throws(() => parseSyncPushResponse(response), /record is required for APPLIED/);

  response.results[0]!.status = "REJECTED";
  assert.throws(() => parseSyncPushResponse(response), /errorCode is required for REJECTED/);
});

test("accepts a bounded push result without exposing internal errors", () => {
  const parsed = parseSyncPushResponse({
    apiVersion: SYNC_API_VERSION,
    batchId: "a62adcc2-c83a-4a91-b00d-dedc0850d672",
    results: [{
      idempotencyKey: "ad94c430-4ce0-4b6d-b1e8-f9ad4072ce88",
      status: "REJECTED",
      record: null,
      errorCode: "RETRY_LATER",
    }],
  });
  assert.equal(parsed.results[0]?.errorCode, "RETRY_LATER");
});
