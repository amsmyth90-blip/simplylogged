import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loadRoot = new URL("../tools/load/", import.meta.url);

test("sync-write load testing stays below per-account limits and cleans up records", async () => {
  const source = await readFile(new URL("sync-push.js", loadRoot), "utf8");
  assert.match(source, /constant-arrival-rate/);
  assert.match(source, /rate > tokens\.length \* 0\.25/);
  assert.match(source, /operation: "UPSERT"/);
  assert.match(source, /operation: "DELETE"/);
  assert.match(source, /expectedRevision: "1"/);
  assert.match(source, /body\.results\[0\]\?\.status === "APPLIED"/);
  assert.match(source, /body\.results\[1\]\?\.status === "APPLIED"/);
  assert.match(source, /X-Request-Id/);
});

test("load workloads require external synthetic credentials", async () => {
  for (const name of ["sync-pull.js", "sync-push.js"]) {
    const source = await readFile(new URL(name, loadRoot), "utf8");
    assert.match(source, /DIARYDOCK_LOAD_ACCESS_TOKENS/);
    assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}\./);
    assert.doesNotMatch(source, /service[_-]?role/i);
  }
});
