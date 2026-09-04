import { parseSyncRecord } from "@diarydock/contracts";
import {
  parsePayload,
  type LocalRecord,
  type PendingMutation,
  type SyncConflict,
  type SyncFailure,
} from "@diarydock/offline-store";

type SqlRow = Record<string, unknown>;

function text(row: SqlRow, key: string) {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Offline data is missing ${key}.`);
  return value;
}

function nullableText(row: SqlRow, key: string) {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`Offline data has invalid ${key}.`);
  return value;
}

function integer(row: SqlRow, key: string) {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value)) throw new Error(`Offline data has invalid ${key}.`);
  return value;
}

export function toLocalRecord(row: SqlRow): LocalRecord {
  return {
    entityType: text(row, "entity_type"),
    id: text(row, "record_id"),
    scope: {
      kind: text(row, "scope_kind") as "USER" | "HOUSEHOLD",
      id: text(row, "scope_id"),
    },
    revision: text(row, "revision"),
    schemaVersion: integer(row, "schema_version"),
    updatedAt: text(row, "updated_at"),
    deletedAt: nullableText(row, "deleted_at"),
    payload: parsePayload(row.payload_json),
    syncState: text(row, "sync_state") as LocalRecord["syncState"],
  };
}

export function toPendingMutation(row: SqlRow): PendingMutation {
  return {
    sequence: integer(row, "sequence"),
    idempotencyKey: text(row, "idempotency_key"),
    recordId: text(row, "record_id"),
    entityType: text(row, "entity_type"),
    operation: text(row, "operation") as PendingMutation["operation"],
    expectedRevision: nullableText(row, "expected_revision"),
    schemaVersion: integer(row, "schema_version"),
    payload: parsePayload(row.payload_json),
    createdAt: text(row, "created_at"),
    attemptCount: integer(row, "attempt_count"),
    retryAfter: nullableText(row, "retry_after"),
    state: text(row, "state") as PendingMutation["state"],
    batchId: nullableText(row, "batch_id"),
    errorCode: nullableText(row, "error_code"),
  };
}

export function toFailure(row: SqlRow): SyncFailure {
  return {
    idempotencyKey: text(row, "idempotency_key"),
    recordId: text(row, "record_id"),
    entityType: text(row, "entity_type"),
    errorCode: text(row, "error_code"),
    detectedAt: text(row, "detected_at"),
  };
}

export function toConflict(row: SqlRow): SyncConflict {
  return {
    idempotencyKey: text(row, "idempotency_key"),
    recordId: text(row, "record_id"),
    entityType: text(row, "entity_type"),
    localOperation: text(row, "local_operation") as SyncConflict["localOperation"],
    localSchemaVersion: integer(row, "local_schema_version"),
    localPayload: parsePayload(row.local_payload_json),
    serverRecord: parseSyncRecord(JSON.parse(text(row, "server_record_json"))),
    detectedAt: text(row, "detected_at"),
  };
}
