import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import type { capTask } from "@capacitor-community/sqlite";

import type { OfflineDatabase } from "../apps/mobile/src/data/offline/database.ts";
import { SqlitePendingUploadRepository } from "../apps/mobile/src/data/offline/pending-upload-repository.ts";
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

function pendingInput(bytes: Uint8Array) {
  return {
    jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    documentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    fileName: "scan.pdf",
    mimeType: "application/pdf",
    bytes,
    title: "House document",
    category: "Home & Property",
    roomName: "Office",
    details: {
      issuer: "Example Insurer",
      dueDate: "2027-09-01",
      captureJobId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      confirmedFields: [{ key: "policy", label: "Policy", value: "AB12", confidence: 0.9 }],
      reminder: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        title: "Renew policy",
        timeLabel: "Next August",
      },
    },
  };
}

test("pending uploads round-trip encrypted chunks and recover interrupted work", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqlitePendingUploadRepository(database as unknown as OfflineDatabase);
  const bytes = new Uint8Array(500_000);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  await repository.stage({ ...pendingInput(bytes), sha256: await digest(bytes) });

  const claimed = await repository.claimNext();
  assert.deepEqual(claimed?.bytes, bytes);
  assert.equal(claimed?.state, "IN_FLIGHT");
  assert.equal(claimed?.attemptCount, 1);
  assert.equal(claimed?.details?.issuer, "Example Insurer");
  assert.equal(claimed?.details?.confirmedFields?.[0]?.value, "AB12");
  await repository.recoverInterrupted();
  assert.equal((await repository.list())[0]?.state, "QUEUED");

  const reclaimed = await repository.claimNext();
  await repository.release({
    jobId: reclaimed!.jobId,
    errorCode: "HTTP_422",
    retryAfter: null,
    permanent: true,
  });
  assert.equal((await repository.list())[0]?.state, "FAILED");
  await repository.retry(reclaimed!.jobId);
  assert.equal((await repository.list())[0]?.state, "QUEUED");
  await repository.complete(reclaimed!.jobId);
  assert.deepEqual(await repository.list(), []);
  database.raw.close();
});

test("pending upload integrity failures are quarantined locally", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqlitePendingUploadRepository(database as unknown as OfflineDatabase);
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  await repository.stage({ ...pendingInput(bytes), sha256: await digest(bytes) });
  database.raw.prepare(
    "update pending_document_upload_chunks set data_base64 = 'AA==' where job_id = ? and chunk_index = 0",
  ).run(pendingInput(bytes).jobId);
  await assert.rejects(repository.claimNext(), /integrity/i);
  assert.equal((await repository.list())[0]?.state, "FAILED");
  database.raw.close();
});

test("pending upload metadata is bounded by UTF-8 bytes before storage and after retrieval", async () => {
  const database = new DatabaseAdapter();
  const repository = new SqlitePendingUploadRepository(database as unknown as OfflineDatabase);
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const input = { ...pendingInput(bytes), sha256: await digest(bytes) };
  const oversizedText = "界".repeat(20_000);

  await assert.rejects(
    repository.stage({ ...input, details: { extractedText: oversizedText } }),
    /metadata is too large/,
  );
  assert.equal(database.raw.prepare("select count(*) as count from pending_document_uploads").get()?.count, 0);

  await repository.stage(input);
  database.raw.prepare("update pending_document_uploads set metadata_json = ? where job_id = ?")
    .run(JSON.stringify({ extractedText: oversizedText }), input.jobId);
  await assert.rejects(repository.list(), /metadata is invalid/);
  database.raw.close();
});
