import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_USER_STORAGE_BYTES,
  MAX_USER_STORAGE_BYTES,
  buildDocumentStoragePath,
  isOwnedStoredDocument,
  validatePreparedUpload,
} from "../lib/document-upload.ts";

const userId = "9d1c54f6-4321-4f8a-b274-cf68191f3b36";
const documentId = "1da24ac8-f23d-42c1-bcc2-3f5ff8dc562d";

test("document upload allowance has a safe launch default and hard maximum", () => {
  assert.equal(DEFAULT_USER_STORAGE_BYTES, 250 * 1024 * 1024);
  assert.equal(MAX_USER_STORAGE_BYTES, 10 * 1024 * 1024 * 1024);
});

test("stored document references must be in the signed-in user's immutable prefix", () => {
  const path = buildDocumentStoragePath(userId, documentId, "My Passport.PDF");
  assert.equal(path, `${userId}/${documentId}/my-passport.pdf`);
  assert.equal(isOwnedStoredDocument(userId, { bucket: "diarydock-documents", path }), true);
  assert.equal(isOwnedStoredDocument("11111111-1111-4111-8111-111111111111", { bucket: "diarydock-documents", path }), false);
  assert.equal(isOwnedStoredDocument(userId, { bucket: "other", path }), false);
});

test("prepared uploads reject invalid identifiers, types and oversized files", () => {
  assert.match(validatePreparedUpload({ documentId: "bad", fileName: "x.pdf", mimeType: "application/pdf", size: 10 }) ?? "", /identifier/i);
  assert.match(validatePreparedUpload({ documentId, fileName: "x.exe", mimeType: "application/octet-stream", size: 10 }) ?? "", /PDF/i);
  assert.match(validatePreparedUpload({ documentId, fileName: "x.pdf", mimeType: "application/pdf", size: 4 * 1024 * 1024 + 1 }) ?? "", /4 MB/i);
  assert.equal(validatePreparedUpload({ documentId, fileName: "x.pdf", mimeType: "application/pdf", size: 1024 }), null);
});
