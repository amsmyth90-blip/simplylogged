import assert from "node:assert/strict";
import test from "node:test";

import type { PGlite } from "@electric-sql/pglite";

import { parseSyncPushResponse } from "../packages/contracts/src/index.ts";
import {
  createSyncDatabase,
  resetDatabaseRole,
  setAuthenticatedUser,
  setServiceRole,
} from "./support/sync-database-fixture.mts";

const userId = "11111111-1111-4111-8111-111111111111";

function request(entityType: string, seed: number) {
  const suffix = String(seed).padStart(12, "0");
  return {
    apiVersion: "2026-09-01",
    deviceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    batchId: `10000000-0000-4000-8000-${suffix}`,
    mutations: [{
      idempotencyKey: `20000000-0000-4000-8000-${suffix}`,
      recordId: `30000000-0000-4000-8000-${suffix}`,
      entityType,
      operation: "UPSERT",
      expectedRevision: null,
      schemaVersion: 1,
      payload: entityType === "reminder" ? {
        title: "Bounded reminder",
        group: "today",
        timeLabel: "Today",
        priority: "normal",
        timeZone: "Europe/London",
      } : {},
    }],
  };
}

function batchRequest(entityType: string, firstSeed: number, count: number) {
  const body = request(entityType, firstSeed);
  return {
    ...body,
    mutations: Array.from({ length: count }, (_, index) =>
      request(entityType, firstSeed + index).mutations[0]),
  };
}

async function direct(database: PGlite, body: object) {
  return database.query(
    "select public.apply_sync_mutations($1::jsonb)",
    [JSON.stringify(body)],
  );
}

async function server(database: PGlite, body: object) {
  await setServiceRole(database);
  const result = await database.query<{ response: unknown }>(
    "select public.apply_sync_mutations_server($1::uuid, $2::jsonb) as response",
    [userId, JSON.stringify(body)],
  );
  return parseSyncPushResponse(result.rows[0]?.response);
}

test("the sync database enforces authorization and request throttling", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await setAuthenticatedUser(database, userId);
    await assert.rejects(
      database.query(
        "select public.apply_sync_mutations_server($1::uuid, $2::jsonb)",
        [userId, JSON.stringify(request("reminder", 1))],
      ),
      /permission denied|Service role required/i,
    );
    await assert.rejects(
      direct(database, {}),
      /permission denied/i,
    );

    const unsupported = await server(database, request("unsupported", 1));
    assert.equal(unsupported.results[0]?.errorCode, "UNSUPPORTED_SCHEMA");
    for (let seed = 2; seed <= 120; seed += 1) {
      await server(database, request("unsupported", seed));
    }
    const limited = await server(database, request("reminder", 121));
    assert.equal(limited.results[0]?.errorCode, "RETRY_LATER");

    await resetDatabaseRole(database);
    const counts = await database.query<{ idempotency: number; rate_limits: number }>(
      `select
        (select count(*) from public.sync_idempotency) as idempotency,
        (select count(*) from public.sync_mutation_rate_limits) as rate_limits`,
    );
    assert.equal(counts.rows[0]?.idempotency, 0);
    assert.equal(counts.rows[0]?.rate_limits, 1);
  } finally {
    await database.close();
  }
});

test("authenticated clients cannot mutate reminder rows outside sync", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await setAuthenticatedUser(database, userId);
    await assert.rejects(database.query(
      `insert into public.reminders (
        id, user_id, title, reminder_group, time_label, priority
      ) values ('direct-write', $1, 'Bypass', 'today', 'Today', 'normal')`,
      [userId],
    ), /permission denied/i);
    const applied = await server(database, request("reminder", 700));
    assert.equal(applied.results[0]?.status, "APPLIED");
  } finally {
    await database.close();
  }
});

test("unsupported direct batches cannot amplify retained work", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await setAuthenticatedUser(database, userId);
    await assert.rejects(
      direct(database, batchRequest("unsupported", 1, 100)),
      /permission denied/i,
    );
    await assert.rejects(
      direct(database, batchRequest("unsupported", 101, 100)),
      /permission denied/i,
    );

    await resetDatabaseRole(database);
    const retained = await database.query<{ count: number }>(
      "select count(*) as count from public.sync_idempotency where owner_id = $1",
      [userId],
    );
    assert.equal(retained.rows[0]?.count, 0);
  } finally {
    await database.close();
  }
});

test("the sync database caps retained idempotency work atomically", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await database.query(
      `insert into public.sync_idempotency (
        owner_id, idempotency_key, request_payload, response_payload
      ) select $1, (
        '40000000-0000-4000-8000-' || lpad(value::text, 12, '0')
      )::uuid, '{}'::jsonb, '{}'::jsonb
      from generate_series(1, 10000) as value`,
      [userId],
    );

    const limited = await server(database, request("reminder", 10001));
    assert.equal(limited.results[0]?.errorCode, "RETRY_LATER");
    await resetDatabaseRole(database);
    const retained = await database.query<{ count: number }>(
      "select count(*) as count from public.sync_idempotency where owner_id = $1",
      [userId],
    );
    assert.equal(retained.rows[0]?.count, 10000);
  } finally {
    await database.close();
  }
});
