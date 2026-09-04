import type { capTask } from "@capacitor-community/sqlite";
import {
  assertEntityType,
  assertRecordId,
  assertSchemaVersion,
  boundedLimit,
  serializePayload,
  type LocalRecord,
  type PendingMutation,
  type RecordQuery,
  type StageMutationInput,
} from "@diarydock/offline-store";

import type { OfflineDatabase } from "./database";
import { toLocalRecord, toPendingMutation } from "./rows";

const RECORD_COLUMNS = `
  entity_type, record_id, scope_kind, scope_id, revision, schema_version,
  updated_at, deleted_at, payload_json, sync_state
`;

const OUTBOX_COLUMNS = `
  sequence, idempotency_key, record_id, entity_type, operation, expected_revision,
  schema_version, payload_json, created_at, attempt_count, retry_after, state,
  batch_id, error_code
`;

export class SqliteRecordRepository {
  constructor(
    private readonly database: OfflineDatabase,
    private readonly accountId: string,
  ) {}

  async getRecord(entityType: string, recordId: string): Promise<LocalRecord | null> {
    assertEntityType(entityType);
    assertRecordId(recordId);
    const result = await this.database.query(
      `SELECT ${RECORD_COLUMNS} FROM offline_records
       WHERE entity_type = ? AND record_id = ? LIMIT 1`,
      [entityType, recordId],
    );
    return result.values?.[0] ? toLocalRecord(result.values[0]) : null;
  }

  async listRecords(query: RecordQuery): Promise<LocalRecord[]> {
    assertEntityType(query.entityType);
    const limit = boundedLimit(query.limit ?? 100, 500);
    const deletedClause = query.includeDeleted ? "" : "AND deleted_at IS NULL";
    const result = await this.database.query(
      `SELECT ${RECORD_COLUMNS} FROM offline_records
       WHERE entity_type = ? ${deletedClause}
       ORDER BY updated_at DESC, record_id ASC LIMIT ?`,
      [query.entityType, limit],
    );
    return (result.values ?? []).map(toLocalRecord);
  }

  async stageMutation(input: StageMutationInput): Promise<PendingMutation> {
    this.validateMutation(input);
    const payloadJson = serializePayload(input.payload);
    const now = new Date().toISOString();
    const queued = await this.findQueuedMutation(input.entityType, input.recordId);
    const idempotencyKey = queued?.idempotencyKey ?? crypto.randomUUID();
    const sequence = queued?.sequence ?? null;
    const tasks: capTask[] = [this.recordUpsert(input, payloadJson, now)];

    if (sequence === null) {
      tasks.push({
        statement: `INSERT INTO sync_outbox (
          idempotency_key, record_id, entity_type, operation, expected_revision,
          schema_version, payload_json, created_at, state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
        values: [
          idempotencyKey, input.recordId, input.entityType, input.operation,
          input.expectedRevision, input.schemaVersion, payloadJson, now,
        ],
      });
    } else {
      tasks.push({
        statement: `UPDATE sync_outbox SET operation = ?, schema_version = ?,
          payload_json = ?, retry_after = NULL, error_code = NULL
          WHERE sequence = ? AND state = 'QUEUED'`,
        values: [input.operation, input.schemaVersion, payloadJson, sequence],
      });
    }

    await this.database.executeTransaction(tasks);
    return this.getMutation(idempotencyKey);
  }

  private validateMutation(input: StageMutationInput) {
    assertRecordId(input.recordId);
    assertEntityType(input.entityType);
    assertSchemaVersion(input.schemaVersion);
    if (input.operation === "DELETE" && Object.keys(input.payload).length) {
      throw new Error("A deletion cannot contain record data.");
    }
  }

  private recordUpsert(input: StageMutationInput, payloadJson: string, now: string): capTask {
    return {
      statement: `INSERT INTO offline_records (
        entity_type, record_id, scope_kind, scope_id, revision, schema_version,
        updated_at, deleted_at, payload_json, sync_state
      ) VALUES (?, ?, 'USER', ?, ?, ?, ?, ?, ?, 'PENDING')
      ON CONFLICT(entity_type, record_id) DO UPDATE SET
        schema_version = excluded.schema_version,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        payload_json = excluded.payload_json,
        sync_state = 'PENDING'`,
      values: [
        input.entityType,
        input.recordId,
        this.accountId,
        input.expectedRevision ?? "0",
        input.schemaVersion,
        now,
        input.operation === "DELETE" ? now : null,
        payloadJson,
      ],
    };
  }

  private async findQueuedMutation(entityType: string, recordId: string) {
    const result = await this.database.query(
      `SELECT ${OUTBOX_COLUMNS} FROM sync_outbox
       WHERE entity_type = ? AND record_id = ? AND state = 'QUEUED'
       ORDER BY sequence DESC LIMIT 1`,
      [entityType, recordId],
    );
    return result.values?.[0] ? toPendingMutation(result.values[0]) : null;
  }

  private async getMutation(idempotencyKey: string) {
    const result = await this.database.query(
      `SELECT ${OUTBOX_COLUMNS} FROM sync_outbox WHERE idempotency_key = ? LIMIT 1`,
      [idempotencyKey],
    );
    if (!result.values?.[0]) throw new Error("The offline change was not queued.");
    return toPendingMutation(result.values[0]);
  }
}
