import assert from "node:assert/strict";
import test from "node:test";

import { DocumentService, documentPayload, parseDocument } from "../packages/documents/src/index.ts";
import type { LocalRecord, OfflineStore } from "../packages/offline-store/src/index.ts";

function record(payload: LocalRecord["payload"]): LocalRecord {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    entityType: "document",
    scope: { kind: "USER", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
    revision: "4",
    schemaVersion: 1,
    updatedAt: "2026-09-01T10:30:00.000Z",
    deletedAt: null,
    payload,
    syncState: "CLEAN",
  };
}

const validPayload = {
  documentId: "passport-document",
  title: "Passport",
  category: "Identity",
  kind: "PDF",
  size: "1.2 MB",
  dueDate: "2030-05-18",
  reviewStatus: "reviewed",
  emergencyVisible: true,
  hasStoredFile: true,
} as const;

test("parses a bounded offline document summary without file storage secrets", () => {
  const document = parseDocument(record(validPayload));
  assert.equal(document.id, "passport-document");
  assert.equal(document.syncId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(document.kind, "PDF");
  assert.equal(document.hasStoredFile, true);
  assert.equal("storagePath" in document, false);
});

test("invalid document projections are excluded from the offline list", async () => {
  const store = {
    listRecords: async () => [record(validPayload), record({ ...validPayload, kind: "Executable" })],
  } as unknown as OfflineStore;
  const documents = await new DocumentService(store).list();
  assert.deepEqual(documents.map((document) => document.id), ["passport-document"]);
});

test("document edits preserve server-controlled file identity", () => {
  const existing = parseDocument(record(validPayload));
  const payload = documentPayload(existing, {
    title: "Current passport",
    category: "Identity",
    dueDate: "2032-06-01",
    emergencyVisible: false,
    issuer: "HM Passport Office",
    reviewStatus: "needs-review",
  });
  assert.equal(payload.documentId, "passport-document");
  assert.equal(payload.kind, "PDF");
  assert.equal(payload.hasStoredFile, true);
  assert.equal("storagePath" in payload, false);
});
