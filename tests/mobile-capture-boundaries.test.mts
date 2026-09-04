import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import { combineCapturePages } from "../apps/mobile/src/capture/combine-pages.ts";
import { capturedDocumentFromFile } from "../apps/mobile/src/capture/capture-source.ts";
import { readBoundedResponseBytes } from "../apps/mobile/src/platform/bounded-response-bytes.ts";
import {
  MAX_DOCUMENT_COMMIT_REQUEST_BYTES,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_METADATA_BYTES,
} from "../packages/documents/src/index.ts";
import {
  parseMobileUploadMetadata,
  persistedMobileUploadMetadata,
} from "../lib/document-upload-metadata.ts";

const onePixelPng = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));

function image(name: string) {
  return { bytes: onePixelPng, fileName: name, mimeType: "image/png", previewUrl: null };
}

test("multi-page mobile captures become a bounded PDF in page order", async () => {
  const combined = await combineCapturePages([image("front.png"), image("back.png")]);
  assert.equal(combined.mimeType, "application/pdf");
  assert.equal(combined.fileName, "diarydock-2-page-scan.pdf");
  assert.equal((await PDFDocument.load(combined.bytes)).getPageCount(), 2);
});

test("a single capture is not needlessly transformed", async () => {
  const capture = image("front.png");
  assert.equal(await combineCapturePages([capture]), capture);
});

test("oversized mobile files are rejected before their bytes are acquired", async () => {
  let reads = 0;
  const file = {
    arrayBuffer: async () => {
      reads += 1;
      return new ArrayBuffer(MAX_DOCUMENT_BYTES + 1);
    },
    name: "oversized.pdf",
    size: MAX_DOCUMENT_BYTES + 1,
    type: "application/pdf",
  } as File;

  await assert.rejects(() => capturedDocumentFromFile(file), /no larger than 4 MB/);
  assert.equal(reads, 0);
});

test("web media acquisition enforces streamed bytes at the exact boundary", async () => {
  const exact = new Response(Uint8Array.of(1, 2, 3, 4));
  assert.deepEqual(await readBoundedResponseBytes(exact, 4), Uint8Array.of(1, 2, 3, 4));

  const oversized = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.of(1, 2, 3));
      controller.enqueue(Uint8Array.of(4, 5));
      controller.close();
    },
  }));
  await assert.rejects(() => readBoundedResponseBytes(oversized, 4), /too large/);
});

test("native camera acquisition reads at most one byte beyond the file limit", () => {
  const source = readFileSync("apps/mobile/src/capture/capture-source.ts", "utf8");
  assert.match(source, /length: MAX_DOCUMENT_BYTES \+ 1/);
  assert.match(source, /bytes\.byteLength > MAX_DOCUMENT_BYTES/);
  assert.doesNotMatch(source, /readFile\(\{ path: result\.uri \}\)/);
});

test("mobile upload metadata is strict and removes confirmation-only fields before persistence", () => {
  const captureJobId = "11111111-1111-4111-8111-111111111111";
  const metadata = parseMobileUploadMetadata({
    title: "Home policy",
    category: "Home & Property",
    roomName: "Safe Room",
    actionItems: ["Review renewal"],
    captureJobId,
    confirmedFields: [{ key: "policy", label: "Policy", value: "DD-1", confidence: 0.9 }],
  });
  assert.ok(metadata);
  assert.equal(metadata.captureJobId, captureJobId);
  const persisted = persistedMobileUploadMetadata(metadata);
  assert.equal("captureJobId" in persisted, false);
  assert.equal("confirmedFields" in persisted, false);
});

test("mobile upload metadata rejects unrecognised and malformed nested input", () => {
  const base = { title: "Policy", category: "Home & Property", roomName: "Office" };
  assert.throws(() => parseMobileUploadMetadata({ ...base, administrator: true }), /unsupported fields/);
  assert.throws(() => parseMobileUploadMetadata({
    ...base,
    reminder: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Renew",
      timeLabel: "Next year",
      privileged: true,
    },
  }), /reminder is invalid/);
  assert.throws(() => parseMobileUploadMetadata({
    ...base,
    confirmedFields: [{ key: "id", label: "ID", value: "1", confidence: 2 }],
  }), /confirmed document field is invalid/);
});

test("mobile upload metadata enforces its aggregate UTF-8 byte boundary", () => {
  const base = { title: "Policy", category: "Home & Property", roomName: "Office" };
  const multibyteText = "界".repeat(20_000);
  assert.ok(multibyteText.length < MAX_DOCUMENT_METADATA_BYTES);
  assert.ok(new TextEncoder().encode(multibyteText).byteLength > MAX_DOCUMENT_METADATA_BYTES);
  assert.throws(
    () => parseMobileUploadMetadata({ ...base, extractedText: multibyteText }),
    /details are too large/,
  );
});

test("mobile and server commit paths share byte-accurate request ceilings", () => {
  assert.ok(MAX_DOCUMENT_COMMIT_REQUEST_BYTES > MAX_DOCUMENT_METADATA_BYTES);
  const client = readFileSync("apps/mobile/src/capture/upload-client.ts", "utf8");
  const route = readFileSync("app/api/documents/uploads/commit/route.ts", "utf8");
  assert.match(client, /TextEncoder\(\)\.encode\(body\)\.byteLength > MAX_DOCUMENT_COMMIT_REQUEST_BYTES/);
  assert.match(route, /readBoundedJson\(request, MAX_DOCUMENT_COMMIT_REQUEST_BYTES\)/);
});
