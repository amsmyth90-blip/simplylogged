import assert from "node:assert/strict";
import test from "node:test";

import type { capTask } from "@capacitor-community/sqlite";

import { SqliteConflictRepository } from "../apps/mobile/src/data/offline/conflict-repository.ts";
import type { OfflineDatabase } from "../apps/mobile/src/data/offline/database.ts";

const conflictRow = {
  idempotency_key: "3189e61a-8172-4aac-b7c8-ecc2cfce1c2f",
  record_id: "65f56887-c667-4d80-b0e5-bb765f120a2f",
  entity_type: "reminder",
  local_operation: "UPSERT",
  local_schema_version: 1,
  local_payload_json: JSON.stringify({
    title: "Review energy tariff",
    group: "later",
    timeLabel: "18 September",
    priority: "normal",
  }),
  server_record_json: JSON.stringify({
    id: "65f56887-c667-4d80-b0e5-bb765f120a2f",
    entityType: "reminder",
    scope: { kind: "USER", id: "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51" },
    revision: "8",
    schemaVersion: 1,
    updatedAt: "2026-09-01T18:30:00.000Z",
    deletedAt: null,
    payload: {
      title: "Review electricity tariff",
      group: "week",
      timeLabel: "This week",
      priority: "normal",
    },
  }),
  detected_at: "2026-09-01T18:31:00.000Z",
};

function repositoryFixture() {
  let tasks: capTask[] = [];
  const database = {
    query: async () => ({ values: [conflictRow] }),
    executeTransaction: async (next: capTask[]) => { tasks = next; },
  } as unknown as OfflineDatabase;
  return {
    repository: new SqliteConflictRepository(database),
    tasks: () => tasks,
  };
}

test("keeping a local conflict rebases it onto the server revision", async () => {
  const fixture = repositoryFixture();
  await fixture.repository.resolveConflict(conflictRow.idempotency_key, "KEEP_LOCAL");

  const tasks = fixture.tasks();
  assert.equal(tasks.length, 5);
  assert.match(tasks[0]!.statement, /DELETE FROM sync_outbox/);
  assert.match(tasks[3]!.statement, /'PENDING'/);
  assert.equal(tasks[3]!.values?.[4], "8");
  assert.match(tasks[4]!.statement, /INSERT INTO sync_outbox/);
  assert.equal(tasks[4]!.values?.[3], "UPSERT");
  assert.equal(tasks[4]!.values?.[4], "8");
  assert.match(String(tasks[4]!.values?.[0]), /^[0-9a-f-]{36}$/);
});

test("using the server version removes pending work and restores a clean record", async () => {
  const fixture = repositoryFixture();
  await fixture.repository.resolveConflict(conflictRow.idempotency_key, "USE_SERVER");

  const tasks = fixture.tasks();
  assert.equal(tasks.length, 4);
  assert.match(tasks[0]!.statement, /DELETE FROM sync_outbox/);
  assert.match(tasks[3]!.statement, /'CLEAN'/);
  assert.equal(tasks[3]!.values?.[4], "8");
  assert.match(String(tasks[3]!.values?.[8]), /Review electricity tariff/);
});
