import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  isAcceptedDocumentType,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "../lib/document-rules.ts";

test("uses the private DiaryDock document bucket", () => {
  assert.equal(DOCUMENT_BUCKET, "diarydock-documents");
});

test("sanitises document names before storage", () => {
  assert.equal(sanitizeDocumentFileName("  Home Insurance (2026).PDF  "), "home-insurance-2026.pdf");
  assert.equal(sanitizeDocumentFileName("../../Passport Copy.png"), "passport-copy.png");
  assert.equal(sanitizeDocumentFileName("Council___Tax###Bill.pdf"), "council-tax-bill.pdf");
  assert.equal(sanitizeDocumentFileName("draft----.PDF"), "draft.pdf");
  assert.equal(sanitizeDocumentFileName(`${"-".repeat(20_000)}notes.pdf`), "notes.pdf");
  assert.equal(sanitizeDocumentFileName("..."), "document");
  assert.ok(sanitizeDocumentFileName("a".repeat(140)).length <= 96);
});

test("accepts only the supported document and image formats", () => {
  for (const type of [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ]) {
    assert.equal(isAcceptedDocumentType(type), true);
  }
  assert.equal(isAcceptedDocumentType("text/html"), false);
  assert.equal(isAcceptedDocumentType("image/svg+xml"), false);
  assert.equal(isAcceptedDocumentType("application/javascript"), false);
});

test("rejects empty, oversized and unsupported uploads", () => {
  assert.equal(
    validateDocumentUpload({ type: "text/html", size: 100 }),
    "Choose a PDF, JPEG, PNG, WebP or HEIC file.",
  );
  assert.equal(
    validateDocumentUpload({ type: "application/pdf", size: MAX_DOCUMENT_BYTES + 1 }),
    "Please choose a file no larger than 4 MB.",
  );
  assert.equal(
    validateDocumentUpload({ type: "application/pdf", size: 0 }),
    "This file is empty. Please choose another file.",
  );
  assert.equal(validateDocumentUpload({ type: "application/pdf", size: MAX_DOCUMENT_BYTES }), null);
});
