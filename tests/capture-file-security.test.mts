import assert from "node:assert/strict";
import test from "node:test";

import { detectDocumentMimeType, inspectCaptureFile } from "../lib/capture/file-security.ts";

test("detects supported document signatures", () => {
  assert.equal(detectDocumentMimeType(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])), "application/pdf");
  assert.equal(detectDocumentMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(
    detectDocumentMimeType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png"
  );
  assert.equal(
    detectDocumentMimeType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    "image/webp"
  );
});

test("rejects disguised and unknown uploads", () => {
  assert.deepEqual(
    inspectCaptureFile({ declaredMimeType: "image/jpeg", bytes: Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]) }),
    { ok: false, error: "The file contents do not match the selected file type." }
  );
  assert.equal(inspectCaptureFile({ declaredMimeType: "image/jpeg", bytes: Uint8Array.from([1, 2, 3]) }).ok, false);
});

test("accepts a matching supported signature", () => {
  assert.deepEqual(
    inspectCaptureFile({ declaredMimeType: "image/jpeg", bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0x00]) }),
    { ok: true, detectedMimeType: "image/jpeg" }
  );
});
