import type { capTask } from "@capacitor-community/sqlite";
import {
  assertEntityType,
  assertRecordId,
  serializePayload,
  type ConflictResolution,
  type SyncConflict,
  type SyncFailure,
} from "@diarydock/offline-store";

import type { OfflineDatabase } from "./database.ts";
import { toConflict, toFailure } from "./rows.ts";

export class SqliteConflictRepository {
  private readonly database: OfflineDatabase;

  constructor(database: OfflineDatabase) {
    this.database = database;
  }

  async listConflicts(): Promise<SyncConflict[]> {
    const result = await this.database.query(
      "SELECT * FROM sync_conflicts ORDER BY detected_at DESC LIMIT 100",
    );
    return (result.values ?? []).map(toConflict);
  }

  async listFailures(): Promise<SyncFailure[]> {
    const result = await this.database.query(
      "SELECT * FROM sync_failures ORDER BY detected_at DESC LIMIT 100",
    );
    return (result.values ?? []).map(toFailure);
  }

  async resolveConflict(idempotencyKey: string, resolution: ConflictResolution) {
    assertRecordId(idempotencyKey);
    const conflict = await this.getConflict(idempotencyKey);
    assertEntityType(conflict.entityType);
    if (resolution !== "KEEP_LOCAL" && resolution !== "USE_SERVER") {
      throw new Error("The conflict resolution is invalid.");
    }

    const tasks = this.cleanupTasks(conflict);
    if (resolution === "USE_SERVER") {
      tasks.push(this.serverRecordTask(conflict));
    } else {
      tasks.push(this.localRecordTask(conflict));
      tasks.push(this.retryMutationTask(conflict));
    }
    await this.database.executeTransaction(tasks);
  }

  private async getConflict(idempotencyKey: string) {
    const result = await this.database.query(
      "SELECT * FROM sync_conflicts WHERE idempotency_key = ? LIMIT 1",
      [idempotencyKey],
    );
    if (!result.values?.[0]) throw new Error("The sync conflict was not found.");
    return toConflict(result.values[0]);
  }

  private cleanupTasks(conflict: SyncConflict): capTask[] {
    const record = [conflict.entityType, conflict.recordId];
    return [
      {
        statement: "DELETE FROM sync_outbox WHERE entity_type = ? AND record_id = ?",
        values: record,
      },
      {
        statement: "DELETE FROM sync_conflicts WHERE entity_type = ? AND record_id = ?",
        values: record,
      },
      {
        statement: "DELETE FROM sync_failures WHERE entity_type = ? AND record_id = ?",
        values: record,
      },
    ];
  }

  private serverRecordTask(conflict: SyncConflict): capTask {
    const record = conflict.serverRecord;
    return {
      statement: `${recordUpsertSql("CLEAN")}`,
      values: [
        record.entityType, record.id, record.scope.kind, record.scope.id, record.revision,
        record.schemaVersion, record.updatedAt, record.deletedAt,
        serializePayload(record.payload),
      ],
    };
  }

  private localRecordTask(conflict: SyncConflict): capTask {
    const record = conflict.serverRecord;
    const now = new Date().toISOString();
    return {
      statement: `${recordUpsertSql("PENDING")}`,
      values: [
        conflict.entityType, conflict.recordId, record.scope.kind, record.scope.id,
        record.revision, conflict.localSchemaVersion, now,
        conflict.localOperation === "DELETE" ? now : null,
        serializePayload(conflict.localPayload),
      ],
    };
  }

  private retryMutationTask(conflict: SyncConflict): capTask {
    return {
      statement: `INSERT INTO sync_outbox (
        idempotency_key, record_id, entity_type, operation, expected_revision,
        schema_version, payload_json, created_at, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
      values: [
        crypto.randomUUID(), conflict.recordId, conflict.entityType,
        conflict.localOperation, conflict.serverRecord.revision,
        conflict.localSchemaVersion, serializePayload(conflict.localPayload),
        new Date().toISOString(),
      ],
    };
  }
}

function recordUpsertSql(state: "CLEAN" | "PENDING") {
  return `INSERT INTO offline_records (
    entity_type, record_id, scope_kind, scope_id, revision, schema_version,
    updated_at, deleted_at, payload_json, sync_state
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '${state}')
  ON CONFLICT(entity_type, record_id) DO UPDATE SET
    scope_kind = excluded.scope_kind, scope_id = excluded.scope_id,
    revision = excluded.revision, schema_version = excluded.schema_version,
    updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
    payload_json = excluded.payload_json, sync_state = excluded.sync_state`;
}
