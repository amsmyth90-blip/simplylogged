import assert from "node:assert/strict";
import test from "node:test";

import {
  createSyncDatabase,
  resetDatabaseRole,
} from "./support/sync-database-fixture.mts";

const ownerId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const viewerId = "33333333-3333-4333-8333-333333333333";
const householdId = "44444444-4444-4444-8444-444444444444";

test("active collaborator membership promotes private reminders and refreshes rejoin scope", async () => {
  const database = await createSyncDatabase();
  try {
    await database.query(
      "insert into auth.users(id) values ($1),($2),($3)",
      [ownerId, memberId, viewerId],
    );
    await database.query(
      "insert into public.reminders(id,user_id,title,reminder_group,time_label,priority) "
        + "values ('member-reminder',$1,'Member task','today','Today','normal'),"
        + "('viewer-reminder',$2,'Viewer task','today','Today','normal')",
      [memberId, viewerId],
    );
    await database.query(
      "insert into public.households(id,owner_id) values ($1,$2)",
      [householdId, ownerId],
    );
    await database.query(
      "insert into public.household_memberships(household_id,user_id,role,status,joined_at) "
        + "values ($1,$2,'owner','active','2026-09-01T00:00:00Z'),"
        + "($1,$3,'member','active','2026-09-01T00:00:00Z'),"
        + "($1,$4,'viewer','active','2026-09-01T00:00:00Z')",
      [householdId, ownerId, memberId, viewerId],
    );
    const scoped = await database.query<{
      id: string;
      scope_kind: string;
      scope_id: string;
    }>("select id,scope_kind,scope_id from public.reminders order by id");
    assert.deepEqual(scoped.rows, [
      { id: "member-reminder", scope_kind: "HOUSEHOLD", scope_id: householdId },
      { id: "viewer-reminder", scope_kind: "USER", scope_id: viewerId },
    ]);

    await database.query(
      "update public.household_memberships set status='removed' where user_id=$1",
      [memberId],
    );
    await database.query(
      "insert into public.reminders(id,user_id,title,reminder_group,time_label,priority) "
        + "values ('private-while-removed',$1,'Private task','later','Later','low')",
      [memberId],
    );
    await database.query(
      "update public.household_memberships set status='active' where user_id=$1",
      [memberId],
    );
    const rejoined = await database.query<{
      joined_at: Date;
      scope_kind: string;
      scope_id: string;
    }>(
      "select membership.joined_at, reminder.scope_kind, reminder.scope_id "
        + "from public.household_memberships as membership "
        + "join public.reminders as reminder on reminder.id='private-while-removed' "
        + "where membership.user_id=$1",
      [memberId],
    );
    assert.equal(rejoined.rows[0]?.scope_kind, "HOUSEHOLD");
    assert.equal(rejoined.rows[0]?.scope_id, householdId);
    assert.ok(
      (rejoined.rows[0]?.joined_at.getTime() ?? 0)
        > Date.parse("2026-09-01T00:00:00Z"),
    );

    await resetDatabaseRole(database);
    const projection = await database.query<{
      scope_kind: string;
      scope_id: string;
    }>(
      "select scope_kind,scope_id from public.sync_records "
        + "where source_id='private-while-removed'",
    );
    assert.deepEqual(projection.rows, [{
      scope_kind: "HOUSEHOLD",
      scope_id: householdId,
    }]);
  } finally {
    await database.close();
  }
});
