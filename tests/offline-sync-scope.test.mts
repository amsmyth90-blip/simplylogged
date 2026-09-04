import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import type { capTask } from "@capacitor-community/sqlite";

import type { OfflineDatabase } from "../apps/mobile/src/data/offline/database.ts";
import { OFFLINE_SCHEMA } from "../apps/mobile/src/data/offline/schema.ts";
import { SqliteSyncRepository } from "../apps/mobile/src/data/offline/sync-repository.ts";

const accountId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const currentHouseholdId = "a62adcc2-c83a-4a91-b00d-dedc0850d672";
const oldHouseholdId = "9e152506-4667-42e8-84df-47a87956aef9";
const userRecordId = "ad94c430-4ce0-4b6d-b1e8-f9ad4072ce88";
const currentRecordId = "3189e61a-8172-4aac-b7c8-ecc2cfce1c2f";
const staleDocumentId = "65f56887-c667-4d80-b0e5-bb765f120a2f";

class DatabaseAdapter {
  readonly raw = new DatabaseSync(":memory:");

  constructor() {
    this.raw.exec("PRAGMA foreign_keys = ON");
    this.raw.exec(OFFLINE_SCHEMA);
  }

  async query(statement: string, values: unknown[] = []) {
    return { values: this.raw.prepare(statement).all(...values) as Record<string, unknown>[] };
  }

  async run(statement: string, values: unknown[] = []) {
    this.raw.prepare(statement).run(...values);
    return { changes: { changes: 1 } };
  }

  async executeTransaction(tasks: capTask[]) {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      tasks.forEach((task) => this.raw.prepare(task.statement).run(...(task.values ?? [])));
      this.raw.exec("COMMIT");
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
    return { changes: { changes: tasks.length } };
  }
}

function addRecord(database: DatabaseAdapter, id: string, scopeKind: string, scopeId: string) {
  database.raw.prepare(
    "INSERT INTO offline_records VALUES (?, ?, ?, ?, '1', 1, ?, NULL, '{}', 'CLEAN')",
  ).run("document", id, scopeKind, scopeId, "2026-09-04T12:00:00.000Z");
}

function seedScopedData(database: DatabaseAdapter) {
  addRecord(database, userRecordId, "USER", accountId);
  addRecord(database, currentRecordId, "HOUSEHOLD", currentHouseholdId);
  addRecord(database, staleDocumentId, "HOUSEHOLD", oldHouseholdId);
  database.raw.prepare(
    "INSERT INTO sync_outbox (idempotency_key,record_id,entity_type,operation,schema_version,payload_json,created_at,state) VALUES (?,?,?,?,1,'{}',?,'QUEUED')",
  ).run(oldHouseholdId, staleDocumentId, "document", "UPSERT", "2026-09-04T12:00:00.000Z");
  database.raw.prepare(
    "INSERT INTO sync_conflicts VALUES (?,?,?,?,?,?,?,?)",
  ).run(oldHouseholdId, staleDocumentId, "document", "UPSERT", 1, "{}", "{}", "2026-09-04T12:00:00.000Z");
  database.raw.prepare(
    "INSERT INTO sync_failures VALUES (?,?,?,?,?)",
  ).run(oldHouseholdId, staleDocumentId, "document", "FORBIDDEN", "2026-09-04T12:00:00.000Z");
  database.raw.prepare(
    "INSERT INTO offline_file_cache VALUES (?,?,?,1,?,1,?,?)",
  ).run(staleDocumentId, "v1", "application/pdf", "a".repeat(64), "2026-09-04", "2026-09-04");
  database.raw.prepare(
    "INSERT INTO pending_document_uploads (job_id,document_id,file_name,mime_type,byte_length,sha256,chunk_count,title,category,state,created_at,updated_at) VALUES (?,?,?,?,1,?,1,?,?,'QUEUED',?,?)",
  ).run(accountId, staleDocumentId, "proof.pdf", "application/pdf", "b".repeat(64), "Proof", "Home", "2026-09-04", "2026-09-04");
  addReadModel(database);
}

function addReadModel(database: DatabaseAdapter) {
  database.raw.prepare(
    "INSERT INTO cached_read_models VALUES ('household-detail',1,'{}','2026-09-04')",
  ).run();
}

function count(database: DatabaseAdapter, table: string) {
  return Number(database.raw.prepare("SELECT count(*) AS count FROM " + table).get()?.count);
}

test("authoritative pull scope atomically purges inaccessible encrypted data", async () => {
  const database = new DatabaseAdapter();
  seedScopedData(database);
  const repository = new SqliteSyncRepository(database as unknown as OfflineDatabase);

  await repository.applyRemoteBatch([], "cursor-1", currentHouseholdId);
  assert.deepEqual(
    database.raw.prepare("SELECT record_id FROM offline_records ORDER BY record_id")
      .all().map((row) => String(row.record_id)),
    [currentRecordId, userRecordId],
  );
  for (const table of [
    "sync_outbox",
    "sync_conflicts",
    "sync_failures",
    "offline_file_cache",
    "pending_document_uploads",
    "cached_read_models",
  ]) assert.equal(count(database, table), 0, table);
  assert.equal(
    database.raw.prepare("SELECT active_household_id FROM sync_checkpoint").get()?.active_household_id,
    currentHouseholdId,
  );

  addReadModel(database);
  await repository.applyRemoteBatch([], "cursor-2", currentHouseholdId);
  assert.equal(count(database, "cached_read_models"), 1);

  await repository.applyRemoteBatch([], "cursor-3", null);
  assert.deepEqual(
    database.raw.prepare("SELECT record_id FROM offline_records")
      .all().map((row) => String(row.record_id)),
    [userRecordId],
  );
  assert.equal(count(database, "cached_read_models"), 0);
  assert.equal(
    database.raw.prepare("SELECT active_household_id FROM sync_checkpoint").get()?.active_household_id,
    null,
  );
  database.raw.close();
});
