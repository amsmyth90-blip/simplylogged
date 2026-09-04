import type { capTask } from "@capacitor-community/sqlite";
import type { SyncPushResult, SyncRecord } from "@diarydock/contracts";
import {
  assertRecordId,
  boundedLimit,
  serializePayload,
  type PendingMutation,
} from "@diarydock/offline-store";

import type { OfflineDatabase } from "./database.ts";
import { toPendingMutation } from "./rows.ts";
import { assertHouseholdId, purgeHouseholdTasks, readHouseholdScope } from "./sync-scope-cleanup.ts";

const OUTBOX_COLUMNS = `
  sequence, idempotency_key, record_id, entity_type, operation, expected_revision,
  schema_version, payload_json, created_at, attempt_count, retry_after, state,
  batch_id, error_code
`;

export class SqliteSyncRepository {
  private readonly database: OfflineDatabase;

  constructor(database: OfflineDatabase) {
    this.database = database;
  }

  async recoverInterruptedBatches() {
    await this.database.run(
      `UPDATE sync_outbox SET state = 'QUEUED', batch_id = NULL
       WHERE state = 'IN_FLIGHT'`,
    );
  }

  async claimPendingBatch(batchId: string, requestedLimit: number): Promise<PendingMutation[]> {
    assertRecordId(batchId);
    const limit = boundedLimit(requestedLimit, 100);
    const now = new Date().toISOString();
    const ready = await this.database.query(
      `SELECT sequence FROM sync_outbox
       WHERE state = 'QUEUED' AND (retry_after IS NULL OR retry_after <= ?)
       ORDER BY sequence ASC LIMIT ?`,
      [now, limit],
    );
    const sequences = (ready.values ?? []).map((row) => Number(row.sequence));
    if (!sequences.length) return [];

    await this.database.executeTransaction(sequences.map((sequence) => ({
      statement: `UPDATE sync_outbox SET state = 'IN_FLIGHT', batch_id = ?,
        attempt_count = attempt_count + 1 WHERE sequence = ? AND state = 'QUEUED'`,
      values: [batchId, sequence],
    })));

    const claimed = await this.database.query(
      `SELECT ${OUTBOX_COLUMNS} FROM sync_outbox
       WHERE batch_id = ? AND state = 'IN_FLIGHT' ORDER BY sequence ASC`,
      [batchId],
    );
    return (claimed.values ?? []).map(toPendingMutation);
  }

  async releasePendingBatch(batchId: string, retryAfter: string | null) {
    assertRecordId(batchId);
    await this.database.run(
      `UPDATE sync_outbox SET state = 'QUEUED', batch_id = NULL, retry_after = ?
       WHERE batch_id = ? AND state = 'IN_FLIGHT'`,
      [retryAfter, batchId],
    );
  }

  async applyRemoteBatch(
    records: SyncRecord[],
    nextCursor: string | null,
    activeHouseholdId: string | null,
  ) {
    if (records.length > 500) throw new Error("The remote sync batch is too large.");
    assertHouseholdId(activeHouseholdId);
    const previousScope = await readHouseholdScope(this.database);
    const tasks: capTask[] = purgeHouseholdTasks(activeHouseholdId);
    if (!previousScope.found || previousScope.id !== activeHouseholdId) {
      tasks.push({ statement: "DELETE FROM cached_read_models" });
    }

    for (const record of records) {
      const pending = await this.pendingForRecord(record.entityType, record.id);
      if (!pending) {
        tasks.push(this.upsertServerRecord(record, "CLEAN"));
        continue;
      }
      if (pending.expectedRevision === record.revision) continue;

      const localPayload = await this.localPayload(record.entityType, record.id);
      tasks.push(this.insertConflict(pending, localPayload, record));
      tasks.push({
        statement: `UPDATE offline_records SET sync_state = 'CONFLICT'
          WHERE entity_type = ? AND record_id = ?`,
        values: [record.entityType, record.id],
      });
    }

    tasks.push({
      statement: `INSERT INTO sync_checkpoint (name, cursor, active_household_id, updated_at)
        VALUES ('primary', ?, ?, ?) ON CONFLICT(name) DO UPDATE SET
        cursor = excluded.cursor, active_household_id = excluded.active_household_id,
        updated_at = excluded.updated_at`,
      values: [nextCursor, activeHouseholdId, new Date().toISOString()],
    });
    await this.database.executeTransaction(tasks);
  }

  async applyPushResults(batchId: string, results: SyncPushResult[]) {
    assertRecordId(batchId);
    const claimed = await this.claimedByBatch(batchId);
    const claimedByKey = new Map(claimed.map((item) => [item.idempotencyKey, item]));
    for (const result of results) {
      if (!claimedByKey.has(result.idempotencyKey)) {
        throw new Error("The sync response contains an unclaimed mutation.");
      }
    }

    const tasks: capTask[] = [];
    for (const result of results) {
      const mutation = claimedByKey.get(result.idempotencyKey)!;
      if (result.status === "APPLIED" && result.record) {
        await this.acceptApplied(tasks, mutation, result.record);
      } else if (result.status === "CONFLICT" && result.record) {
        tasks.push(this.insertConflict(mutation, mutation.payload, result.record));
        tasks.push(...this.blockConflictedRecord(mutation));
      } else if (result.errorCode === "RETRY_LATER") {
        tasks.push({
          statement: `UPDATE sync_outbox SET state = 'QUEUED', batch_id = NULL,
            retry_after = ? WHERE idempotency_key = ?`,
          values: [new Date(Date.now() + 30_000).toISOString(), mutation.idempotencyKey],
        });
      } else if (result.errorCode) {
        tasks.push(...this.blockRejectedMutation(mutation, result.errorCode));
      }
    }

    tasks.push({
      statement: `UPDATE sync_outbox SET state = 'QUEUED', batch_id = NULL,
        retry_after = ? WHERE batch_id = ? AND state = 'IN_FLIGHT'`,
      values: [new Date(Date.now() + 30_000).toISOString(), batchId],
    });
    await this.database.executeTransaction(tasks);
  }

  async getCursor() {
    const result = await this.database.query(
      "SELECT cursor FROM sync_checkpoint WHERE name = 'primary' LIMIT 1",
    );
    const cursor = result.values?.[0]?.cursor;
    return typeof cursor === "string" ? cursor : null;
  }

  private async acceptApplied(tasks: capTask[], mutation: PendingMutation, record: SyncRecord) {
    const next = await this.nextForRecord(mutation);
    tasks.push({
      statement: "DELETE FROM sync_outbox WHERE idempotency_key = ?",
      values: [mutation.idempotencyKey],
    });
    if (next) {
      tasks.push({
        statement: "UPDATE sync_outbox SET expected_revision = ? WHERE sequence = ?",
        values: [record.revision, next.sequence],
      });
      tasks.push({
        statement: `UPDATE offline_records SET revision = ?, updated_at = ?
          WHERE entity_type = ? AND record_id = ?`,
        values: [record.revision, record.updatedAt, record.entityType, record.id],
      });
    } else {
      tasks.push(this.upsertServerRecord(record, "CLEAN"));
    }
  }

  private blockConflictedRecord(mutation: PendingMutation): capTask[] {
    return [
      { statement: "DELETE FROM sync_outbox WHERE idempotency_key = ?", values: [mutation.idempotencyKey] },
      {
        statement: `UPDATE sync_outbox SET state = 'BLOCKED', batch_id = NULL,
          error_code = 'CONFLICT' WHERE entity_type = ? AND record_id = ?`,
        values: [mutation.entityType, mutation.recordId],
      },
      {
        statement: `UPDATE offline_records SET sync_state = 'CONFLICT'
          WHERE entity_type = ? AND record_id = ?`,
        values: [mutation.entityType, mutation.recordId],
      },
    ];
  }

  private blockRejectedMutation(mutation: PendingMutation, errorCode: string): capTask[] {
    const now = new Date().toISOString();
    return [
      {
        statement: `UPDATE sync_outbox SET state = 'BLOCKED', batch_id = NULL,
          error_code = ? WHERE idempotency_key = ?`,
        values: [errorCode, mutation.idempotencyKey],
      },
      {
        statement: `INSERT INTO sync_failures
          (idempotency_key, record_id, entity_type, error_code, detected_at)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(idempotency_key) DO UPDATE SET
          error_code = excluded.error_code, detected_at = excluded.detected_at`,
        values: [mutation.idempotencyKey, mutation.recordId, mutation.entityType, errorCode, now],
      },
      {
        statement: `UPDATE offline_records SET sync_state = 'CONFLICT'
          WHERE entity_type = ? AND record_id = ?`,
        values: [mutation.entityType, mutation.recordId],
      },
    ];
  }

  private upsertServerRecord(record: SyncRecord, state: "CLEAN"): capTask {
    return {
      statement: `INSERT INTO offline_records (${RECORD_INSERT_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_type, record_id) DO UPDATE SET
        scope_kind = excluded.scope_kind, scope_id = excluded.scope_id,
        revision = excluded.revision, schema_version = excluded.schema_version,
        updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
        payload_json = excluded.payload_json, sync_state = excluded.sync_state`,
      values: recordValues(record, state),
    };
  }

  private insertConflict(
    mutation: PendingMutation,
    localPayload: Record<string, unknown>,
    record: SyncRecord,
  ): capTask {
    return {
      statement: `INSERT INTO sync_conflicts
        (idempotency_key, record_id, entity_type, local_operation,
         local_schema_version, local_payload_json, server_record_json, detected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(idempotency_key) DO UPDATE SET
        local_operation = excluded.local_operation,
        local_schema_version = excluded.local_schema_version,
        local_payload_json = excluded.local_payload_json,
        server_record_json = excluded.server_record_json,
        detected_at = excluded.detected_at`,
      values: [
        mutation.idempotencyKey, mutation.recordId, mutation.entityType, mutation.operation,
        mutation.schemaVersion, JSON.stringify(localPayload), JSON.stringify(record),
        new Date().toISOString(),
      ],
    };
  }

  private async pendingForRecord(entityType: string, recordId: string) {
    const result = await this.database.query(
      `SELECT ${OUTBOX_COLUMNS} FROM sync_outbox WHERE entity_type = ? AND record_id = ?
       ORDER BY sequence ASC LIMIT 1`,
      [entityType, recordId],
    );
    return result.values?.[0] ? toPendingMutation(result.values[0]) : null;
  }

  private async localPayload(entityType: string, recordId: string) {
    const result = await this.database.query(
      "SELECT payload_json FROM offline_records WHERE entity_type = ? AND record_id = ? LIMIT 1",
      [entityType, recordId],
    );
    return result.values?.[0] ? JSON.parse(String(result.values[0].payload_json)) : {};
  }

  private async claimedByBatch(batchId: string) {
    const result = await this.database.query(
      `SELECT ${OUTBOX_COLUMNS} FROM sync_outbox WHERE batch_id = ? AND state = 'IN_FLIGHT'`,
      [batchId],
    );
    return (result.values ?? []).map(toPendingMutation);
  }

  private async nextForRecord(mutation: PendingMutation) {
    const result = await this.database.query(
      `SELECT ${OUTBOX_COLUMNS} FROM sync_outbox WHERE entity_type = ? AND record_id = ?
       AND sequence > ? AND state = 'QUEUED' ORDER BY sequence ASC LIMIT 1`,
      [mutation.entityType, mutation.recordId, mutation.sequence],
    );
    return result.values?.[0] ? toPendingMutation(result.values[0]) : null;
  }
}

const RECORD_INSERT_COLUMNS = `
  entity_type, record_id, scope_kind, scope_id, revision, schema_version,
  updated_at, deleted_at, payload_json, sync_state
`;

function recordValues(record: SyncRecord, state: "CLEAN") {
  return [
    record.entityType, record.id, record.scope.kind, record.scope.id, record.revision,
    record.schemaVersion, record.updatedAt, record.deletedAt,
    serializePayload(record.payload), state,
  ];
}
