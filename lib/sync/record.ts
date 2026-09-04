import { parseSyncRecord, type JsonObject } from "@diarydock/contracts";

export type SyncProjectionRow = {
  record_id: unknown;
  entity_type: unknown;
  scope_kind: unknown;
  scope_id: unknown;
  revision: unknown;
  schema_version: unknown;
  updated_at: unknown;
  deleted_at: unknown;
  payload: unknown;
  change_sequence: unknown;
};

function timestamp(value: unknown) {
  if (typeof value !== "string") throw new Error("The sync record timestamp is invalid.");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error("The sync record timestamp is invalid.");
  return parsed.toISOString();
}

export function projectionToSyncRecord(row: SyncProjectionRow) {
  return parseSyncRecord({
    id: String(row.record_id),
    entityType: String(row.entity_type),
    scope: { kind: String(row.scope_kind), id: String(row.scope_id) },
    revision: String(row.revision),
    schemaVersion: Number(row.schema_version),
    updatedAt: timestamp(row.updated_at),
    deletedAt: row.deleted_at === null ? null : timestamp(row.deleted_at),
    payload: row.payload as JsonObject,
  });
}

export function projectionSequence(row: SyncProjectionRow) {
  const value = String(row.change_sequence);
  if (!/^(0|[1-9][0-9]{0,18})$/.test(value)) {
    throw new Error("The sync change sequence is invalid.");
  }
  return BigInt(value);
}
