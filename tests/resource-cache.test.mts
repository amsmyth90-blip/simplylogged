import assert from "node:assert/strict";
import test from "node:test";

import { removeNonOwnedDocumentsFromCache } from "../lib/resource-cache.ts";

test("does not persist another user's shared document in private state", () => {
  const result = removeNonOwnedDocumentsFromCache({
    userId: "user-b",
    documents: [
      { id: "owned", ownerId: "user-b" },
      { id: "shared", ownerId: "user-a" },
      { id: "legacy-without-owner" }
    ],
    roomDocuments: {
      office: [
        { id: "office-owned" },
        { id: "office-shared" },
        { id: "manual-note" }
      ]
    }
  });

  assert.deepEqual(result.documents.map((document) => document.id), [
    "owned",
    "legacy-without-owner"
  ]);
  assert.deepEqual(result.roomDocuments.office.map((document) => document.id), [
    "office-owned",
    "manual-note"
  ]);
});

test("returns existing cache collections when everything is owned", () => {
  const documents = [{ id: "owned", ownerId: "user-a" }];
  const roomDocuments = { office: [{ id: "office-owned" }] };
  const result = removeNonOwnedDocumentsFromCache({
    userId: "user-a",
    documents,
    roomDocuments
  });

  assert.equal(result.documents, documents);
  assert.equal(result.roomDocuments, roomDocuments);
});
