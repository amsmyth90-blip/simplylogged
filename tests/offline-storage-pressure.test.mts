import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  tryCacheFile,
  tryGetReadModel,
  tryPutReadModel,
  tryRemoveReadModel,
} from "../packages/offline-store/src/cache-policy.ts";

const input = {
  documentId: "document",
  version: "version",
  mimeType: "application/pdf",
  bytes: Uint8Array.of(1),
  sha256: "a".repeat(64),
};

test("optional offline caching reports storage pressure without throwing", async () => {
  assert.equal(await tryCacheFile({ cacheFile: async () => undefined }, input), true);
  assert.equal(await tryCacheFile({ cacheFile: async () => {
    throw new Error("database or disk is full");
  } }, input), false);
});

test("authoritative server snapshots survive optional read-model cache pressure", async () => {
  const payload = { revision: 2 };
  assert.equal(await tryPutReadModel({
    putReadModel: async () => undefined,
  }, "snapshot", 1, payload), true);
  assert.equal(await tryPutReadModel({
    putReadModel: async () => {
      throw new Error("encrypted database is full");
    },
  }, "snapshot", 1, payload), false);
});

test("online refresh can bypass unavailable read-model cache and cleanup", async () => {
  const cached = { key: "snapshot", schemaVersion: 1, payload: { revision: 1 } };
  assert.deepEqual(await tryGetReadModel({
    getReadModel: async () => cached,
  }, "snapshot"), cached);
  assert.equal(await tryGetReadModel({
    getReadModel: async () => { throw new Error("database unavailable"); },
  }, "snapshot"), null);
  assert.equal(await tryRemoveReadModel({
    removeReadModel: async () => undefined,
  }, "snapshot"), true);
  assert.equal(await tryRemoveReadModel({
    removeReadModel: async () => { throw new Error("database unavailable"); },
  }, "snapshot"), false);
});

test("a completed upload is removed even when its optional cache cannot be retained", async () => {
  const source = await readFile(new URL(
    "../apps/mobile/src/capture/upload-engine.ts",
    import.meta.url,
  ), "utf8");
  assert.match(source, /await this\.store\.completeDocumentUpload[\s\S]*await tryCacheFile\(this\.store/);
  assert.doesNotMatch(source, /await this\.store\.cacheFile/);
});

test("an online document remains viewable when offline retention fails", async () => {
  const source = await readFile(new URL(
    "../apps/mobile/src/files/DocumentViewer.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(source, /Boolean\(cached\) \|\| await tryCacheFile/);
  assert.match(source, /could not retain an offline copy/);
});
