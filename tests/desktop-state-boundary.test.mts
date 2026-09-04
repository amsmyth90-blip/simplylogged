import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  parseDiaryDockStateSaveRequest,
  parseDiaryDockStateSaveResponse,
} from "../lib/diarydock-state-save.ts";

const revision = "2026-09-04T20:50:00.000Z";

function validRequest() {
  const listKeys = [
    "reminders", "vaultDocuments", "householdMembers", "familyInvites",
    "careContacts", "emergencyContacts", "emergencyPlans", "homeInfo",
    "settingsGroups", "mailboxItems", "kitchenItems", "kitchenRecipes",
    "kitchenNoticeboard", "familyCalendarEvents", "kidSchedules",
    "householdProfiles", "familyStories",
  ];
  const objectKeys = [
    "settingsProfile", "roomTasks", "roomDocuments", "roomActivity", "onboarding",
    "mealPlan", "willsWishes", "bills", "insurance", "contracts",
    "correspondence", "professionalContacts", "vehicles", "trips",
    "travelChecklist", "health",
  ];
  const privateState = Object.fromEntries([
    ...listKeys.map((key) => [key, []]),
    ...objectKeys.map((key) => [key, {}]),
    ["kitchenCookingProgress", null],
  ]);
  const householdState = {
    reminders: privateState.reminders,
    mealPlan: privateState.mealPlan,
    kitchenItems: privateState.kitchenItems,
    kitchenRecipes: privateState.kitchenRecipes,
    kitchenNoticeboard: privateState.kitchenNoticeboard,
    familyCalendarEvents: privateState.familyCalendarEvents,
    kidSchedules: privateState.kidSchedules,
    householdProfiles: privateState.householdProfiles,
  };
  return {
    privateRevision: revision,
    householdRevision: revision,
    privateState,
    householdState,
  };
}

test("desktop state save accepts the complete matching application state", () => {
  const parsed = parseDiaryDockStateSaveRequest(validRequest());
  assert.equal(parsed.privateRevision, revision);
  assert.deepEqual(parsed.privateState, validRequest().privateState);
});

test("desktop state save rejects unknown fields and mismatched shared state", () => {
  assert.throws(() => parseDiaryDockStateSaveRequest({
    ...validRequest(),
    ownerId: "attacker-selected",
  }), /Invalid state save request/);
  const mismatch = validRequest();
  mismatch.householdState.reminders = [{
    id: "other", title: "Injected", group: "today", timeLabel: "Now", priority: "normal",
  }];
  assert.throws(() => parseDiaryDockStateSaveRequest(mismatch), /do not match/);
});

test("desktop state save rejects malformed revisions and incomplete state", () => {
  assert.throws(() => parseDiaryDockStateSaveRequest({
    ...validRequest(),
    privateRevision: "yesterday",
  }), /Invalid state revision/);
  const incomplete = validRequest();
  const state = incomplete.privateState as unknown as Record<string, unknown>;
  delete state.health;
  assert.throws(() => parseDiaryDockStateSaveRequest(incomplete), /state shape/);
});

test("desktop state response requires exact server revisions", () => {
  assert.deepEqual(parseDiaryDockStateSaveResponse({
    status: "OK",
    privateRevision: revision,
    householdRevision: revision,
  }), {
    status: "OK",
    privateRevision: revision,
    householdRevision: revision,
  });
  assert.throws(() => parseDiaryDockStateSaveResponse({
    status: "OK", privateRevision: revision, householdRevision: null,
  }), /Incomplete/);
});

test("legacy state writes are service-only after all callers migrate", async () => {
  const [migration, emergency, wills] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260904205000_desktop_state_service_boundary.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/emergency/snapshot-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/wills/mobile-snapshot-server.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /pg_column_size\(input_private_payload\) > 2097152/);
  assert.match(migration, /pg_column_size\(input_household_payload\) > 1048576/);
  assert.match(migration, /input_private_payload -> key is distinct from input_household_payload -> key/);
  assert.match(emergency, /writeClient\.rpc\("apply_mobile_private_state"/);
  assert.match(wills, /writeClient\.rpc\("apply_mobile_private_state"/);
});

async function stateDatabase(
  beforeCompaction?: (database: PGlite) => Promise<void>,
) {
  const database = new PGlite();
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role', true), '')
    $$;
    create table public.app_state(
      id text primary key, payload jsonb not null,
      updated_at timestamptz not null default clock_timestamp()
    );
    create table public.documents(
      id text primary key, user_id uuid not null, title text not null,
      category text not null, kind text not null, size_label text not null,
      room_id text, room_name text, issuer text, due_date text,
      storage_bucket text, storage_path text, original_file_name text,
      mime_type text, extraction_summary text, extracted_text text,
      action_items jsonb not null default '[]', confidence numeric,
      review_status text not null default 'reviewed',
      review_reasons jsonb not null default '[]', reviewed_at text,
      emergency_visible boolean not null default false,
      shared_with jsonb not null default '[]'
    );
    create table public.households(id uuid primary key, owner_id uuid not null);
    create table public.household_memberships(
      household_id uuid not null, user_id uuid not null unique,
      role text not null, status text not null
    );
    create table public.household_state(
      household_id uuid primary key, payload jsonb not null,
      updated_at timestamptz not null default clock_timestamp()
    );
    create function public.touch_test_revision() returns trigger language plpgsql as $$
      begin new.updated_at = clock_timestamp(); return new; end
    $$;
    create trigger app_state_revision before update on public.app_state
      for each row execute function public.touch_test_revision();
    create trigger household_state_revision before update on public.household_state
      for each row execute function public.touch_test_revision();
    grant select,insert,update on public.app_state to authenticated;
    grant select,insert,update on public.household_state to authenticated;
  `);
  const migration = await readFile(new URL(
    "../supabase/migrations/20260904205000_desktop_state_service_boundary.sql",
    import.meta.url,
  ), "utf8");
  await database.exec(migration);
  if (beforeCompaction) await beforeCompaction(database);
  const compaction = await readFile(new URL(
    "../supabase/migrations/20260904210000_compact_normalized_document_state.sql",
    import.meta.url,
  ), "utf8");
  await database.exec(compaction);
  return database;
}

async function databaseRole(database: PGlite, role: "authenticated" | "service_role") {
  await database.exec("reset role");
  await database.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await database.exec(`set role ${role}`);
}

test("desktop state transaction rolls back both documents on a stale revision", async () => {
  const database = await stateDatabase();
  const userId = "11111111-1111-4111-8111-111111111111";
  const householdId = "22222222-2222-4222-8222-222222222222";
  const shared = {
    reminders: [], mealPlan: {}, kitchenItems: [], kitchenRecipes: [],
    kitchenNoticeboard: [], familyCalendarEvents: [], kidSchedules: [],
    householdProfiles: [],
  };
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await database.query("insert into households(id,owner_id) values ($1,$2)",
      [householdId, userId]);
    await database.query("insert into household_memberships values ($1,$2,'owner','active')",
      [householdId, userId]);
    await databaseRole(database, "service_role");
    const first = await database.query<{
      status: string; private_revision: Date; household_revision: Date;
    }>("select * from apply_diarydock_state($1,null,null,$2::jsonb,$3::jsonb)", [
      userId, JSON.stringify({ ...shared, privateMarker: "first" }), JSON.stringify(shared),
    ]);
    assert.equal(first.rows[0]?.status, "OK");
    const conflict = await database.query<{ status: string }>(
      "select * from apply_diarydock_state($1,$2,$3,$4::jsonb,$5::jsonb)", [
        userId, first.rows[0]?.private_revision, "2000-01-01T00:00:00Z",
        JSON.stringify({ ...shared, privateMarker: "overwritten" }), JSON.stringify(shared),
      ],
    );
    assert.equal(conflict.rows[0]?.status, "CONFLICT");
    await database.exec("reset role");
    const stored = await database.query<{ payload: { privateMarker: string } }>(
      "select payload from app_state where id=$1", [userId],
    );
    assert.equal(stored.rows[0]?.payload.privateMarker, "first");

    await databaseRole(database, "authenticated");
    await assert.rejects(database.query(
      "update app_state set payload='{}' where id=$1", [userId],
    ), /permission denied/i);
    await assert.rejects(database.query(
      "update household_state set payload='{}' where household_id=$1", [householdId],
    ), /permission denied/i);
  } finally {
    await database.close();
  }
});

test("state persistence removes only documents proven in normalised storage", async () => {
  const database = await stateDatabase();
  const userId = "33333333-3333-4333-8333-333333333333";
  const householdId = "44444444-4444-4444-8444-444444444444";
  const normalisedId = "55555555-5555-4555-8555-555555555555";
  const shared = {
    reminders: [], mealPlan: {}, kitchenItems: [], kitchenRecipes: [],
    kitchenNoticeboard: [], familyCalendarEvents: [], kidSchedules: [],
    householdProfiles: [],
  };
  try {
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await database.query("insert into households(id,owner_id) values ($1,$2)",
      [householdId, userId]);
    await database.query("insert into household_memberships values ($1,$2,'owner','active')",
      [householdId, userId]);
    await database.query(
      `insert into documents(id,user_id,title,category,kind,size_label)
       values ($1,$2,'Stored','Identity','PDF','10 KB')`,
      [normalisedId, userId],
    );
    await databaseRole(database, "service_role");
    const documents = [
      { id: normalisedId, title: "Stored", category: "Identity", kind: "PDF", size: "10 KB" },
      { id: "legacy-only", title: "Legacy", category: "Home", kind: "Note", size: "Note" },
    ];
    const result = await database.query<{ status: string }>(
      "select status from apply_diarydock_state($1,null,null,$2::jsonb,$3::jsonb)",
      [userId, JSON.stringify({ ...shared, vaultDocuments: documents }), JSON.stringify(shared)],
    );
    assert.equal(result.rows[0]?.status, "OK");
    await database.exec("reset role");
    const stored = await database.query<{ payload: { vaultDocuments: Array<{ id: string }> } }>(
      "select payload from app_state where id=$1", [userId],
    );
    assert.deepEqual(stored.rows[0]?.payload.vaultDocuments, [documents[1]]);
  } finally {
    await database.close();
  }
});

test("eligible legacy documents are backfilled before progressive compaction", async () => {
  const userId = "66666666-6666-4666-8666-666666666666";
  const documentId = "77777777-7777-4777-8777-777777777777";
  const legacyDocument = {
    id: documentId, title: "Legacy policy", category: "Insurance",
    kind: "PDF", size: "12 KB", actionItems: ["Review renewal"],
    reviewReasons: [], reviewedAt: "Just now", emergencyVisible: false,
    sharedWith: [],
  };
  const database = await stateDatabase(async (pending) => {
    await pending.query("insert into auth.users(id) values ($1)", [userId]);
    await pending.query(
      "insert into app_state(id,payload) values ($1,$2::jsonb)",
      [userId, JSON.stringify({ vaultDocuments: [legacyDocument] })],
    );
  });
  try {
    const migrated = await database.query<{ title: string; action_items: string[] }>(
      "select title,action_items from documents where id=$1 and user_id=$2",
      [documentId, userId],
    );
    assert.deepEqual(migrated.rows[0], {
      title: "Legacy policy", action_items: ["Review renewal"],
    });
    await database.query("update app_state set payload=payload where id=$1", [userId]);
    const state = await database.query<{ payload: { vaultDocuments: unknown[] } }>(
      "select payload from app_state where id=$1", [userId],
    );
    assert.deepEqual(state.rows[0]?.payload.vaultDocuments, []);
  } finally {
    await database.close();
  }
});
