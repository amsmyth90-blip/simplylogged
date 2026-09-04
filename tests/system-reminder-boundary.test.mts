import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MAX_PROPOSAL_DECISION_BYTES,
  parseProposalDecision,
} from "../lib/actions/proposal-decision.ts";
import {
  createSyncDatabase,
  resetDatabaseRole,
  setAuthenticatedUser,
  setServiceRole,
} from "./support/sync-database-fixture.mts";

const userId = "87180366-d528-4d4c-b9f6-99ac6a0e30a9";

test("proposal decisions and generated reminder sources are exact and bounded", () => {
  assert.equal(MAX_PROPOSAL_DECISION_BYTES, 2048);
  assert.deepEqual(parseProposalDecision({
    decision: "approve",
    proposalId: "9cc7c227-8fc4-459a-9044-41ebcf1fc4aa",
  }), {
    decision: "approve",
    proposalId: "9cc7c227-8fc4-459a-9044-41ebcf1fc4aa",
  });
  assert.throws(() => parseProposalDecision({
    decision: "approve", proposalId: crypto.randomUUID(), userId,
  }), /fields/);
});

test("proposal decisions use the service-only generated-reminder boundary", async () => {
  const route = await readFile(
    new URL("../app/api/actions/proposals/route.ts", import.meta.url), "utf8",
  );
  const migration = await readFile(new URL(
    "../supabase/migrations/20260904211000_system_reminder_service_boundary.sql",
    import.meta.url,
  ), "utf8");
  assert.match(route, /readBoundedJson\(request, MAX_PROPOSAL_DECISION_BYTES\)/);
  assert.match(route, /sameOrigin\(request\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /getSupabaseAdminClient\(\)[\s\S]*\.rpc\("decide_action_request_server"/);
  assert.doesNotMatch(route, /\.rpc\("sync_system_reminders"/);
  assert.doesNotMatch(route, /\.rpc\("finalize_action_request"/);
  assert.match(migration, /sync_system_reminders[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/i);
});

test("signed-in clients cannot fabricate protected generated reminders", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await setAuthenticatedUser(database, userId);
    await assert.rejects(
      database.query(
        "select public.sync_system_reminders($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        ["vehicle", "doc-1", "mot_expiry", "2027-09-01T09:00:00Z",
          "MOT renewal", null, "garage", "Garage", "mot_expiry",
          "capture-mot", 1, [30, 7]],
      ),
      /permission denied/i,
    );
    await assert.rejects(
      database.query(
        "select public.sync_system_reminders_server($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
        [userId, "vehicle", "doc-1", "mot_expiry", "2027-09-01T09:00:00Z",
          "MOT renewal", null, "garage", "Garage", "mot_expiry",
          "capture-mot", 1, [30, 7]],
      ),
      /permission denied|Service role required/i,
    );
    await assert.rejects(
      database.query(
        "select * from public.finalize_action_request($1,$2,$3)",
        [crypto.randomUUID(), "approve", true],
      ),
      /permission denied/i,
    );
    await assert.rejects(
      database.query(
        "select * from public.decide_action_request_server($1,$2,$3)",
        [userId, crypto.randomUUID(), "approve"],
      ),
      /permission denied|Service role required/i,
    );
  } finally {
    await resetDatabaseRole(database);
    await database.close();
  }
});

test("approving a proposal creates its schedule and audit atomically", async () => {
  const database = await createSyncDatabase();
  const documentId = "capture-document-1";
  const actionId = "1bf725a0-567a-4ca4-b766-57fe3b358f2a";
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await database.query(
      "insert into public.documents(id,user_id,title) values ($1,$2,$3)",
      [documentId, userId, "MOT certificate"],
    );
    await database.query(
      `insert into public.action_requests(
        id,user_id,action_type,status,title,proposed_payload,source_document_id
      ) values ($1,$2,'create_reminder','proposed',$3,$4,$5)`,
      [actionId, userId, "Renew MOT", {
        dueDate: "2027-09-01",
        reminderType: "mot_expiry",
        resourceType: "vehicle",
      }, documentId],
    );
    await setServiceRole(database);
    const decided = await database.query<{ status: string }>(
      "select * from public.decide_action_request_server($1,$2,$3)",
      [userId, actionId, "approve"],
    );
    assert.equal(decided.rows[0]?.status, "completed");
    await resetDatabaseRole(database);
    const evidence = await database.query<{
      audits: number;
      reminders: number;
      status: string;
    }>(
      `select request.status,
        (select count(*)::integer from public.reminders where user_id = $1) reminders,
        (select count(*)::integer from public.audit_events where action_request_id = $2) audits
      from public.action_requests request where request.id = $2`,
      [userId, actionId],
    );
    assert.deepEqual(evidence.rows[0], {
      audits: 1,
      reminders: 6,
      status: "completed",
    });
    await setServiceRole(database);
    const replay = await database.query(
      "select * from public.decide_action_request_server($1,$2,$3)",
      [userId, actionId, "approve"],
    );
    assert.equal(replay.rows.length, 0);
  } finally {
    await resetDatabaseRole(database);
    await database.close();
  }
});

test("the application service creates a bounded idempotent schedule", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await setServiceRole(database);
    const input = [userId, "vehicle", "document:doc-1", "mot_expiry",
      "2027-09-01T09:00:00Z", "MOT renewal", "Confirmed date", "garage",
      "Garage", "mot_expiry", "capture-mot-expiry", 1, [30, 7]];
    const first = await database.query<{ sync_system_reminders_server: number }>(
      "select public.sync_system_reminders_server($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      input,
    );
    assert.equal(first.rows[0]?.sync_system_reminders_server, 2);
    await resetDatabaseRole(database);
    const reminders = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.reminders where user_id = $1",
      [userId],
    );
    const projections = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.sync_records where owner_id = $1 and entity_type = 'reminder'",
      [userId],
    );
    assert.equal(reminders.rows[0]?.count, 2);
    assert.equal(projections.rows[0]?.count, 2);
    await setServiceRole(database);
    await database.query(
      "select public.sync_system_reminders_server($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      input,
    );
    await resetDatabaseRole(database);
    const replayed = await database.query<{ count: number }>(
      "select count(*)::integer as count from public.reminders where user_id = $1",
      [userId],
    );
    assert.equal(replayed.rows[0]?.count, 2);
    await setServiceRole(database);
    await assert.rejects(
      database.query(
        "select public.sync_system_reminders_server($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
        [...input.slice(0, 12), [7, 7]],
      ),
      /Invalid reminder schedule/i,
    );
  } finally {
    await resetDatabaseRole(database);
    await database.close();
  }
});
