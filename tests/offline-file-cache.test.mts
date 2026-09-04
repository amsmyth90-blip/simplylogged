import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import type { capTask } from "@capacitor-community/sqlite";

import type { OfflineDatabase } from "../apps/mobile/src/data/offline/database.ts";
import { SqliteFileCacheRepository } from "../apps/mobile/src/data/offline/file-cache-repository.ts";
import { OFFLINE_SCHEMA } from "../apps/mobile/src/data/offline/schema.ts";

class DatabaseAdapter {
  readonly raw = new DatabaseSync(":memory:");

  constructor() {
    this.raw.exec("PRAGMA foreign_keys = ON");
    this.raw.exec(OFFLINE_SCHEMA);
  }

  async query(statement: string, values: unknown[] = []) {
    return { values: this.raw.prepare(statement).all(...values) as Record<string, unknown>[] };
  }

  async run(statement: string, values: unknown[] = []) {
    this.raw.prepare(statement).run(...values);
    return { changes: { changes: 1 } };
  }

  async executeTransaction(tasks: capTask[]) {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      tasks.forEach((task) => this.raw.prepare(task.statement).run(...(task.values ?? [])));
      this.raw.exec("COMMIT");
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
    return { changes: { changes: tasks.length } };
  }
}

async function digest(bytes: Uint8Array) {
  const value = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

test("encrypted database cache round-trips and rejects corrupt file content", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqliteFileCacheRepository(database as unknown as OfflineDatabase);
  const bytes = new Uint8Array(400_000);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  const sha256 = await digest(bytes);
  await repository.cacheFile({
    documentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    version: "file-v1",
    mimeType: "application/pdf",
    bytes,
    sha256,
  });

  const cached = await repository.getCachedFile(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "file-v1",
  );
  assert.deepEqual(cached?.bytes, bytes);
  assert.equal(cached?.sha256, sha256);
  assert.equal(await repository.getCachedFile(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "stale-version",
  ), null);

  database.raw.prepare(
    "update offline_file_chunks set data_base64 = 'AA==' where document_id = ? and chunk_index = 0",
  ).run("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(await repository.getCachedFile(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "file-v1",
  ), null);
  assert.equal(database.raw.prepare("select count(*) as count from offline_file_cache").get()?.count, 0);
  database.raw.close();
});

test("file cache rejects unsupported and oversized content", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqliteFileCacheRepository(database as unknown as OfflineDatabase);
  const bytes = new Uint8Array([1, 2, 3]);
  await assert.rejects(repository.cacheFile({
    documentId: "document",
    version: "v1",
    mimeType: "text/html",
    bytes,
    sha256: await digest(bytes),
  }), /type is not allowed/);
  database.raw.close();
});
