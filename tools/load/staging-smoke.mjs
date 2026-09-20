import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const usersPath = resolve(root, ".env.staging.load-users.local.json");
const fixture = JSON.parse(await readFile(usersPath, "utf8"));
const origin = String(process.env.DIARYDOCK_LOAD_ORIGIN ?? process.argv[2] ?? "").replace(/\/$/, "");
const originUrl = new URL(origin);

if (originUrl.hostname === "diarydock.com" || originUrl.hostname === "www.diarydock.com") {
  throw new Error("Production is refused; use an isolated preview or local origin.");
}
if (fixture.purpose !== "diarydock-load-test" || !fixture.users?.[0]?.accessToken) {
  throw new Error("A recognised synthetic staging user is required.");
}

const token = fixture.users[0].accessToken;
const headers = { Authorization: `Bearer ${token}`, "User-Agent": "DiaryDock-staging-smoke/1" };

async function jsonRequest(path, init = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  if (!response.ok || !response.headers.get("x-request-id")) {
    throw new Error(`${path} failed with HTTP ${response.status}.`);
  }
  return body;
}

const initial = await jsonRequest("/api/sync/pull");
if (initial.apiVersion !== "2026-09-01" || typeof initial.nextCursor !== "string") {
  throw new Error("Initial pull returned an invalid contract.");
}

const recordId = randomUUID();
const createKey = randomUUID();
const createBatch = randomUUID();
const created = await jsonRequest("/api/sync/push", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    apiVersion: "2026-09-01",
    deviceId: randomUUID(),
    batchId: createBatch,
    mutations: [{
      idempotencyKey: createKey,
      recordId,
      entityType: "reminder",
      operation: "UPSERT",
      expectedRevision: null,
      schemaVersion: 1,
      payload: {
        title: "Synthetic staging smoke",
        group: "today",
        timeLabel: "Today",
        priority: "normal",
        origin: "USER_CREATED",
        reminderType: "custom",
        timeZone: "Europe/London",
      },
    }],
  }),
});
if (created.batchId !== createBatch || created.results?.[0]?.status !== "APPLIED") {
  throw new Error("The staging create mutation was not applied.");
}

const afterCreate = await jsonRequest(`/api/sync/pull?cursor=${encodeURIComponent(initial.nextCursor)}`);
const createdRecord = afterCreate.records?.find((record) => record.id === recordId);
if (!createdRecord || createdRecord.deletedAt !== null) {
  throw new Error("The created record was not visible through incremental pull.");
}

const deleteBatch = randomUUID();
const removed = await jsonRequest("/api/sync/push", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    apiVersion: "2026-09-01",
    deviceId: randomUUID(),
    batchId: deleteBatch,
    mutations: [{
      idempotencyKey: randomUUID(),
      recordId,
      entityType: "reminder",
      operation: "DELETE",
      expectedRevision: createdRecord.revision,
      schemaVersion: 1,
      payload: {},
    }],
  }),
});
if (removed.batchId !== deleteBatch || removed.results?.[0]?.status !== "APPLIED") {
  throw new Error("The staging delete mutation was not applied.");
}

const afterDelete = await jsonRequest(`/api/sync/pull?cursor=${encodeURIComponent(afterCreate.nextCursor)}`);
const tombstone = afterDelete.records?.find((record) => record.id === recordId);
if (!tombstone?.deletedAt) throw new Error("The deleted record tombstone was not returned.");

console.log(JSON.stringify({
  passed: true,
  checks: ["authenticated-pull", "create-push", "incremental-pull", "delete-push", "tombstone-pull"],
}));
