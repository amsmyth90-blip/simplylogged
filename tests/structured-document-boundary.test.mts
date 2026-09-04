import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseStructuredDocumentDelete,
  parseStructuredDocumentMutation,
  structuredDocumentInput,
} from "../lib/structured-document-contract.ts";
import {
  createSyncDatabase,
  resetDatabaseRole,
  setAuthenticatedUser,
  setServiceRole,
} from "./support/sync-database-fixture.mts";

const userId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";

test("structured document requests are exact and bounded", () => {
  const input = structuredDocumentInput({
    category: "Insurance", id: documentId, kind: "PDF", size: "20 KB",
    title: "Home cover", updated: "Today", reviewedAt: "Just now",
    storageBucket: "diarydock-documents",
    storagePath: `${userId}/${documentId}/policy.pdf`,
  });
  assert.equal(parseStructuredDocumentMutation(input).title, "Home cover");
  assert.equal(parseStructuredDocumentMutation(input).reviewedAt, "Just now");
  assert.equal(parseStructuredDocumentDelete({ documentId }), documentId);
  assert.throws(() => parseStructuredDocumentMutation({ ...input, extra: true }), /Invalid/);
  assert.throws(() => parseStructuredDocumentMutation({
    ...input, extractedText: "x".repeat(64_001),
  }), /extracted text/i);
  assert.throws(() => parseStructuredDocumentDelete({ documentId, ownerId: userId }), /Invalid/);
});

test("document deletion is owner-scoped and leaves a durable storage cleanup job", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await database.query(
      `insert into public.documents (
        id, user_id, title, category, kind, size_label, storage_bucket, storage_path
      ) values ($1, $2::uuid, 'Policy', 'Insurance', 'PDF', '20 KB',
        'diarydock-documents', $2::text || '/' || $1 || '/policy.pdf')`,
      [documentId, userId],
    );
    await setAuthenticatedUser(database, userId);
    await assert.rejects(database.query(
      "delete from public.documents where id = $1",
      [documentId],
    ), /permission denied/i);

    await setServiceRole(database);
    const deletion = await database.query<{ status: string }>(
      "select status from public.delete_diarydock_document($1::uuid, $2::text)",
      [userId, documentId],
    );
    assert.equal(deletion.rows[0]?.status, "DELETED");
    await resetDatabaseRole(database);
    const counts = await database.query<{ documents: number; jobs: number }>(
      `select (select count(*) from public.documents) as documents,
        (select count(*) from public.document_storage_cleanup_jobs) as jobs`,
    );
    assert.deepEqual(counts.rows[0], { documents: 0, jobs: 1 });
  } finally {
    await database.close();
  }
});

test("desktop document helpers use the authenticated service route", async () => {
  const [route, client, migration, cleanupRoute, cleanupWorker, vercelSource] = await Promise.all([
    readFile(new URL("../app/api/diarydock/documents/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/structured-documents.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260904208000_document_service_boundary.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/internal/document-cleanup/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/document-cleanup.ts", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);
  assert.match(route, /sameOrigin/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(route, /delete_diarydock_document/);
  assert.match(route, /document_upload_reservations/);
  assert.match(route, /isOwnedDocumentStoragePath/);
  assert.match(client, /\/api\/diarydock\/documents/);
  assert.doesNotMatch(client, /\.from\("documents"\)/);
  assert.match(migration, /revoke insert, update, delete on table public\.documents/);
  assert.match(cleanupRoute, /timingSafeEqual/);
  assert.match(cleanupRoute, /CRON_SECRET/);
  assert.match(cleanupRoute, /export async function GET/);
  assert.match(cleanupRoute, /export async function POST/);
  assert.match(cleanupWorker, /isOwnedDocumentStoragePath/);
  assert.match(cleanupWorker, /nextAttempt/);
  const vercel = JSON.parse(vercelSource) as { crons?: unknown };
  assert.deepEqual(vercel.crons, [{
    path: "/api/internal/document-cleanup",
    schedule: "17 3 * * *",
  }]);
});
