import assert from "node:assert/strict";

import type { PGlite } from "@electric-sql/pglite";

import {
  parseSyncPushResponse,
  type JsonObject,
} from "../../packages/contracts/src/index.ts";
import {
  resetDatabaseRole,
  setServiceRole,
} from "./sync-database-fixture.mts";

const deviceId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const defaultRecordId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export type MutationInput = {
  entityType?: "document" | "reminder";
  idempotencyKey: string;
  operation?: "UPSERT" | "DELETE";
  expectedRevision?: string | null;
  payload?: JsonObject;
  targetRecordId?: string;
};

export async function applyAuthenticatedSyncRequest(database: PGlite, request: object) {
  const identity = await database.query<{ user_id: string }>(
    "select auth.uid()::text as user_id",
  );
  const userId = identity.rows[0]?.user_id;
  assert.ok(userId);
  await setServiceRole(database);
  const result = await database.query<{ response: unknown }>(
    "select public.apply_sync_mutations_server($1::uuid, $2::jsonb) as response",
    [userId, JSON.stringify(request)],
  );
  return parseSyncPushResponse(result.rows[0]?.response);
}

export function pushSync(database: PGlite, input: MutationInput) {
  return applyAuthenticatedSyncRequest(database, {
    apiVersion: "2026-09-01",
    deviceId,
    batchId: crypto.randomUUID(),
    mutations: [{
      idempotencyKey: input.idempotencyKey,
      recordId: input.targetRecordId ?? defaultRecordId,
      entityType: input.entityType ?? "reminder",
      operation: input.operation ?? "UPSERT",
      expectedRevision: input.expectedRevision ?? null,
      schemaVersion: 1,
      payload: input.payload ?? {},
    }],
  });
}

export async function syncProjection(database: PGlite, id = defaultRecordId) {
  await resetDatabaseRole(database);
  const result = await database.query<{
    owner_id: string;
    revision: number;
    payload: JsonObject;
    deleted_at: Date | null;
  }>(
    "select owner_id, revision, payload, deleted_at from public.sync_records where record_id = $1",
    [id],
  );
  return result.rows[0];
}
