import assert from "node:assert/strict";
import test from "node:test";

import type { PGlite } from "@electric-sql/pglite";

import { parseSyncPushResponse, type JsonObject } from "../packages/contracts/src/index.ts";
import {
  createSyncDatabase,
  resetDatabaseRole,
  setAuthenticatedUser,
  setServiceRole,
} from "./support/sync-database-fixture.mts";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

async function pushDocument(
  database: PGlite,
  input: {
    idempotencyKey: string;
    payload: JsonObject;
    recordId: string;
    revision: string;
  },
) {
  const request = {
    apiVersion: "2026-09-01",
    deviceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    batchId: crypto.randomUUID(),
    mutations: [{
      idempotencyKey: input.idempotencyKey,
      recordId: input.recordId,
      entityType: "document",
      operation: "UPSERT",
      expectedRevision: input.revision,
      schemaVersion: 1,
      payload: input.payload,
    }],
  };
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

test("document metadata projects, edits and preserves storage boundaries", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1), ($2)", [userA, userB]);
    await database.query(
      `insert into public.documents (
        id, user_id, title, category, kind, size_label, issuer,
        due_date, storage_bucket, storage_path, review_status, emergency_visible
      ) values (
        'passport-document', $1, 'Passport', 'Identity', 'PDF', '1.2 MB',
        'HM Passport Office', '2030-05-18', 'diarydock-documents',
        $2 || '/passport.pdf', 'reviewed', true
      )`,
      [userA, userA],
    );
    const projected = await database.query<{
      record_id: string;
      revision: number;
      payload: JsonObject;
    }>("select record_id, revision, payload from public.sync_records where entity_type = 'document'");
    assert.equal(projected.rows[0]?.payload.documentId, "passport-document");
    assert.equal(projected.rows[0]?.payload.hasStoredFile, true);
    assert.match(String(projected.rows[0]?.payload.fileVersion), /^[0-9a-f]{32}$/);
    assert.equal("storagePath" in (projected.rows[0]?.payload ?? {}), false);

    await database.query(
      "update public.documents set title = 'Current passport' where id = 'passport-document'",
    );
    const updated = await database.query<{ revision: number; payload: JsonObject }>(
      "select revision, payload from public.sync_records where entity_type = 'document'",
    );
    assert.equal(updated.rows[0]?.revision, 2);
    assert.equal(updated.rows[0]?.payload.fileVersion, projected.rows[0]?.payload.fileVersion);

    const syncId = projected.rows[0]!.record_id;
    await setAuthenticatedUser(database, userA);
    const edited = await pushDocument(database, {
      idempotencyKey: "13131313-1313-4313-8313-131313131313",
      recordId: syncId,
      revision: "2",
      payload: { ...updated.rows[0]!.payload, title: "Renewed passport", reviewStatus: "needs-review" },
    });
    assert.equal(edited.results[0]?.status, "APPLIED");
    assert.equal(edited.results[0]?.record?.revision, "3");

    await setAuthenticatedUser(database, userA);
    const tampered = await pushDocument(database, {
      idempotencyKey: "14141414-1414-4414-8414-141414141414",
      recordId: syncId,
      revision: "3",
      payload: { ...edited.results[0]!.record!.payload, hasStoredFile: false },
    });
    assert.equal(tampered.results[0]?.errorCode, "FORBIDDEN");

    await setAuthenticatedUser(database, userA);
    const injected = await pushDocument(database, {
      idempotencyKey: "15151515-1515-4515-8515-151515151515",
      recordId: syncId,
      revision: "3",
      payload: { ...edited.results[0]!.record!.payload, storagePath: `${userA}/other.pdf` },
    });
    assert.equal(injected.results[0]?.errorCode, "INVALID_MUTATION");

    await setAuthenticatedUser(database, userB);
    const isolated = await database.query<{ count: number }>(
      "select count(*) as count from public.sync_records where entity_type = 'document'",
    );
    assert.equal(isolated.rows[0]?.count, 0);

    await resetDatabaseRole(database);
    await database.query("delete from public.documents where id = 'passport-document'");
    const removed = await database.query<{ deleted_at: Date | null; payload: JsonObject }>(
      "select deleted_at, payload from public.sync_records where entity_type = 'document'",
    );
    assert.ok(removed.rows[0]?.deleted_at);
    assert.deepEqual(removed.rows[0]?.payload, {});
  } finally {
    await database.close();
  }
});
