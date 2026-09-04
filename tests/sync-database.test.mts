import assert from "node:assert/strict";
import test from "node:test";

import {
  createSyncDatabase,
  resetDatabaseRole,
  setAuthenticatedUser,
} from "./support/sync-database-fixture.mts";
import {
  applyAuthenticatedSyncRequest as applyAuthenticatedRequest,
  defaultRecordId,
  pushSync as push,
  syncProjection as projection,
} from "./support/sync-request-helpers.mts";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const deviceId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const recordId = defaultRecordId;

test("the sync database applies, replays, conflicts and isolates real mutations", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1), ($2)", [userA, userB]);
    await database.query(
      "insert into public.documents(id, user_id) values ('other-document', $1)",
      [userB],
    );
    await setAuthenticatedUser(database, userA);

    const payload = {
      title: "Renew home insurance",
      group: "today",
      timeLabel: "Today",
      priority: "normal",
      timeZone: "Europe/London",
    };
    const first = await push(database, {
      idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payload,
    });
    assert.equal(first.results[0]?.status, "APPLIED");
    assert.equal(first.results[0]?.record?.revision, "1");

    await setAuthenticatedUser(database, userA);
    const replay = await push(database, {
      idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payload,
    });
    assert.deepEqual(replay.results, first.results);
    assert.equal((await projection(database))?.revision, 1);

    await setAuthenticatedUser(database, userA);
    const duplicateMutation = {
      idempotencyKey: "23232323-2323-4232-8232-232323232323",
      recordId: "24242424-2424-4242-8242-242424242424",
      entityType: "reminder",
      operation: "UPSERT",
      expectedRevision: null,
      schemaVersion: 1,
      payload,
    };
    const duplicateRequest = {
      apiVersion: "2026-09-01",
      deviceId,
      batchId: "25252525-2525-4252-8252-252525252525",
      mutations: [duplicateMutation, duplicateMutation],
    };
    await assert.rejects(
      applyAuthenticatedRequest(database, duplicateRequest),
      /Invalid sync request/,
    );

    await setAuthenticatedUser(database, userA);
    const reusedKey = await push(database, {
      idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payload: { ...payload, title: "A different request" },
    });
    assert.equal(reusedKey.results[0]?.errorCode, "INVALID_MUTATION");

    await setAuthenticatedUser(database, userA);
    const conflict = await push(database, {
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      expectedRevision: "0",
      payload,
    });
    assert.equal(conflict.results[0]?.status, "CONFLICT");
    assert.equal(conflict.results[0]?.record?.revision, "1");

    await setAuthenticatedUser(database, userA);
    const updated = await push(database, {
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      expectedRevision: "1",
      payload: { ...payload, group: "week", timeLabel: "This week" },
    });
    assert.equal(updated.results[0]?.record?.revision, "2");

    await setAuthenticatedUser(database, userA);
    const forbiddenDocument = await push(database, {
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
      expectedRevision: "2",
      payload: { ...payload, documentId: "other-document" },
    });
    assert.equal(forbiddenDocument.results[0]?.errorCode, "FORBIDDEN");
    assert.equal((await projection(database))?.revision, 2);

    await setAuthenticatedUser(database, userA);
    const removed = await push(database, {
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
      operation: "DELETE",
      expectedRevision: "2",
    });
    assert.equal(removed.results[0]?.record?.revision, "3");
    assert.ok(removed.results[0]?.record?.deletedAt);
    assert.deepEqual(removed.results[0]?.record?.payload, {});

    await setAuthenticatedUser(database, userB);
    const recordCollision = await push(database, {
      idempotencyKey: "67676767-6767-4676-8676-676767676767",
      targetRecordId: recordId,
      payload,
    });
    assert.equal(recordCollision.results[0]?.errorCode, "FORBIDDEN");

    await setAuthenticatedUser(database, userB);
    const isolated = await database.query<{ count: number }>(
      "select count(*) as count from public.sync_records where entity_type = 'reminder'",
    );
    assert.equal(isolated.rows[0]?.count, 0);
  } finally {
    await database.close();
  }
});

test("system reminders permit only completion and reopening", async () => {
  const database = await createSyncDatabase();
  const systemId = "77777777-7777-4777-8777-777777777777";
  try {
    await database.query("insert into auth.users(id) values ($1)", [userA]);
    await database.query(
      `insert into public.reminders (
        id, user_id, title, reminder_group, time_label, priority,
        origin, reminder_type, source_resource_type, source_resource_id,
        source_date_key, rule_id, rule_version, dedupe_key, schedule_offset_days
      ) values ($1, $2, 'Passport renewal window', 'today', 'Today', 'high',
        'SYSTEM_GENERATED', 'expiry', 'document', 'passport', 'expiry',
        'central-reminder-engine', 1, 'passport:expiry:30', 30)`,
      [systemId, userA],
    );
    const current = await projection(database, systemId);
    assert.equal(current?.revision, 1);

    await setAuthenticatedUser(database, userA);
    const completed = await push(database, {
      idempotencyKey: "88888888-8888-4888-8888-888888888888",
      expectedRevision: "1",
      targetRecordId: systemId,
      payload: { ...current?.payload, group: "done", timeLabel: "Completed" },
    });
    assert.equal(completed.results[0]?.record?.revision, "2");

    await setAuthenticatedUser(database, userA);
    const deletion = await push(database, {
      idempotencyKey: "99999999-9999-4999-8999-999999999999",
      expectedRevision: "2",
      operation: "DELETE",
      targetRecordId: systemId,
    });
    assert.equal(deletion.results[0]?.errorCode, "FORBIDDEN");

    await setAuthenticatedUser(database, userA);
    const reopenedPayload = completed.results[0]?.record?.payload ?? {};
    const reopened = await push(database, {
      idempotencyKey: "12121212-1212-4212-8212-121212121212",
      expectedRevision: "2",
      targetRecordId: systemId,
      payload: { ...reopenedPayload, group: "today", timeLabel: "Today" },
    });
    assert.equal(reopened.results[0]?.record?.revision, "3");
  } finally {
    await database.close();
  }
});

test("household reminders are shared, role-gated and isolated", async () => {
  const database = await createSyncDatabase();
  const member = "33333333-3333-4333-8333-333333333333";
  const viewer = "44444444-4444-4444-8444-444444444444";
  const outsider = "55555555-5555-4555-8555-555555555555";
  const householdId = "66666666-6666-4666-8666-666666666666";
  const payload = {
    title: "Put bins out",
    group: "week",
    timeLabel: "Thursday",
    priority: "normal",
    timeZone: "Europe/London",
  };
  try {
    await database.query(
      "insert into auth.users(id) values ($1),($2),($3),($4)",
      [userA, member, viewer, outsider],
    );
    await database.query(
      "insert into public.households(id,owner_id) values ($1,$2)",
      [householdId, userA],
    );
    await database.query(
      `insert into public.household_memberships(household_id,user_id,role,status)
       values ($1,$2,'owner','active'),($1,$3,'member','active'),
       ($1,$4,'viewer','active')`,
      [householdId, userA, member, viewer],
    );

    await setAuthenticatedUser(database, userA);
    const created = await push(database, {
      idempotencyKey: "77777777-7777-4777-8777-777777777770",
      payload,
    });
    assert.equal(created.results[0]?.record?.scope.kind, "HOUSEHOLD");
    assert.equal(created.results[0]?.record?.scope.id, householdId);

    await setAuthenticatedUser(database, member);
    const memberRead = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.sync_records where entity_type = 'reminder'",
    );
    assert.equal(memberRead.rows[0]?.count, 1);
    const memberUpdate = await push(database, {
      idempotencyKey: "77777777-7777-4777-8777-777777777771",
      expectedRevision: "1",
      payload: { ...payload, title: "Put recycling bins out" },
    });
    assert.equal(memberUpdate.results[0]?.status, "APPLIED");
    assert.equal(memberUpdate.results[0]?.record?.revision, "2");

    await setAuthenticatedUser(database, viewer);
    const viewerRead = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.reminders",
    );
    assert.equal(viewerRead.rows[0]?.count, 1);
    const viewerUpdate = await push(database, {
      idempotencyKey: "77777777-7777-4777-8777-777777777772",
      expectedRevision: "2",
      payload: { ...payload, title: "Viewer edit" },
    });
    assert.equal(viewerUpdate.results[0]?.errorCode, "FORBIDDEN");

    await setAuthenticatedUser(database, outsider);
    const outsiderRead = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.sync_records where entity_type = 'reminder'",
    );
    assert.equal(outsiderRead.rows[0]?.count, 0);
    const outsiderUpdate = await push(database, {
      idempotencyKey: "77777777-7777-4777-8777-777777777773",
      expectedRevision: "2",
      payload: { ...payload, title: "Outsider edit" },
    });
    assert.equal(outsiderUpdate.results[0]?.errorCode, "FORBIDDEN");

    await resetDatabaseRole(database);
    await database.query(
      "update public.household_memberships set status = 'removed' where user_id = $1",
      [member],
    );
    await setAuthenticatedUser(database, member);
    const removedRead = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.sync_records where entity_type = 'reminder'",
    );
    assert.equal(removedRead.rows[0]?.count, 0);
  } finally {
    await resetDatabaseRole(database);
    await database.close();
  }
});
