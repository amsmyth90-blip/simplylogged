import assert from "node:assert/strict";
import test from "node:test";

import {
  createSyncDatabase,
  resetDatabaseRole,
  setServiceRole,
} from "./support/sync-database-fixture.mts";

const ownerId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const householdId = "33333333-3333-4333-8333-333333333333";

test("member deletion preparation transfers household reminders to the owner", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query(
      "insert into auth.users(id,email) values ($1,'owner@example.com'),($2,'member@example.com')",
      [ownerId, memberId],
    );
    await database.query(
      "insert into public.households(id,owner_id) values ($1,$2)",
      [householdId, ownerId],
    );
    await database.query(
      "insert into public.household_memberships(household_id,user_id,role,status) "
        + "values ($1,$2,'owner','active'),($1,$3,'member','active')",
      [householdId, ownerId, memberId],
    );
    await database.query(
      "insert into public.reminders(id,user_id,title,reminder_group,time_label,priority) "
        + "values ('shared-task',$1,'Shared task','today','Today','normal')",
      [memberId],
    );
    await setServiceRole(database);
    const prepared = await database.query<{ prepared: boolean }>(
      "select public.prepare_account_deletion($1) as prepared",
      [memberId],
    );
    assert.equal(prepared.rows[0]?.prepared, true);

    await resetDatabaseRole(database);
    const reminder = await database.query<{ user_id: string; scope_id: string }>(
      "select user_id,scope_id from public.reminders where id='shared-task'",
    );
    assert.deepEqual(reminder.rows, [{ user_id: ownerId, scope_id: householdId }]);
    const projection = await database.query<{ owner_id: string; scope_id: string }>(
      "select owner_id,scope_id from public.sync_records where source_id='shared-task'",
    );
    assert.deepEqual(projection.rows, [{ owner_id: ownerId, scope_id: householdId }]);
  } finally {
    await database.close();
  }
});
