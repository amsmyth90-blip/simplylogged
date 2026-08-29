import assert from "node:assert/strict";
import test from "node:test";

import {
  createLifeInboxFingerprint,
  normaliseDedupePart,
} from "../lib/life-inbox/dedupe.ts";

test("normalises harmless text differences before duplicate comparison", () => {
  assert.equal(normaliseDedupePart("  Council   TAX  "), "council tax");
  assert.equal(normaliseDedupePart(undefined), "");
  assert.equal(normaliseDedupePart("a".repeat(200)).length, 160);
});

test("creates the same fingerprint for equivalent imported records", () => {
  const first = createLifeInboxFingerprint({
    userId: "user-1",
    sourceType: "email_import",
    sourceId: "message-123",
    title: " Council Tax ",
    fileName: "BILL.PDF",
    mimeType: "APPLICATION/PDF",
    size: 2048,
  });
  const second = createLifeInboxFingerprint({
    userId: "USER-1",
    sourceType: "EMAIL_IMPORT",
    sourceId: "message-123",
    title: "council   tax",
    fileName: "bill.pdf",
    mimeType: "application/pdf",
    size: 2048,
  });

  assert.equal(first, second);
});

test("keeps different users and source messages separate", () => {
  const base = {
    sourceType: "email_import",
    sourceId: "message-123",
    title: "Council Tax",
    fileName: "bill.pdf",
    mimeType: "application/pdf",
    size: 2048,
  };

  assert.notEqual(
    createLifeInboxFingerprint({ ...base, userId: "user-1" }),
    createLifeInboxFingerprint({ ...base, userId: "user-2" }),
  );
  assert.notEqual(
    createLifeInboxFingerprint({ ...base, userId: "user-1" }),
    createLifeInboxFingerprint({ ...base, userId: "user-1", sourceId: "message-456" }),
  );
});
