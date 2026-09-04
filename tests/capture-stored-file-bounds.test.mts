import assert from "node:assert/strict";
import test from "node:test";

import { loadBoundedStoredFiles } from "../lib/capture/bounded-stored-files.ts";

const limits = { maximumFileBytes: 4, maximumTotalBytes: 8 };

function blob(size: number) {
  return new Blob([new Uint8Array(size)]);
}

test("stored files accept the exact aggregate limit in order", async () => {
  const inspected: number[] = [];
  const loaded: number[] = [];
  const result = await loadBoundedStoredFiles(
    [4, 4],
    async (size) => { inspected.push(size); return size; },
    async (size) => { loaded.push(size); return blob(size); },
    limits,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(inspected, [4, 4]);
  assert.deepEqual(loaded, [4, 4]);
  if (result.ok) assert.equal(result.files.reduce((sum, file) => sum + file.size, 0), 8);
});

test("stored files reject an aggregate overflow before loading later references", async () => {
  const inspected: number[] = [];
  const loaded: number[] = [];
  const result = await loadBoundedStoredFiles(
    [4, 4, 1, 1],
    async (size) => { inspected.push(size); return size; },
    async (size) => { loaded.push(size); return blob(size); },
    limits,
  );

  assert.deepEqual(result, { ok: false, reason: "TOTAL_TOO_LARGE" });
  assert.deepEqual(inspected, [4, 4, 1]);
  assert.deepEqual(loaded, []);
});

test("duplicate stored references count toward the aggregate limit", async () => {
  let inspections = 0;
  let downloads = 0;
  const result = await loadBoundedStoredFiles(
    ["same", "same", "same"],
    async () => { inspections += 1; return 4; },
    async () => { downloads += 1; return blob(4); },
    limits,
  );

  assert.deepEqual(result, { ok: false, reason: "TOTAL_TOO_LARGE" });
  assert.equal(inspections, 3);
  assert.equal(downloads, 0);
});

test("per-file and missing-object failures stop before acquisition", async () => {
  let downloads = 0;
  const oversized = await loadBoundedStoredFiles(
    [5, 1],
    async (size) => size,
    async (size) => { downloads += 1; return blob(size); },
    limits,
  );
  assert.deepEqual(oversized, { ok: false, reason: "FILE_TOO_LARGE" });
  assert.equal(downloads, 0);

  const missing = await loadBoundedStoredFiles(
    [null, 1],
    async (size) => size,
    async (size) => { downloads += 1; return size === null ? null : blob(size); },
    limits,
  );
  assert.deepEqual(missing, { ok: false, reason: "MISSING" });
  assert.equal(downloads, 0);
});

test("downloaded bytes are rechecked if immutable metadata ever drifts", async () => {
  let downloads = 0;
  const result = await loadBoundedStoredFiles(
    [1, 1],
    async () => 1,
    async () => { downloads += 1; return blob(5); },
    limits,
  );

  assert.deepEqual(result, { ok: false, reason: "FILE_TOO_LARGE" });
  assert.equal(downloads, 1);
});
