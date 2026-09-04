import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "20260902010000_kitchen_notice_transaction.sql",
  "20260902110000_mobile_bill_transaction.sql",
  "20260902120000_mobile_insurance_transaction.sql",
  "20260902130000_mobile_contract_transaction.sql",
  "20260902140000_mobile_correspondence_transaction.sql",
  "20260904202000_mobile_office_service_boundary.sql",
  "20260904203000_kitchen_notice_service_boundary.sql",
] as const;

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

async function createDatabase() {
  const database = new PGlite();
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role', true), '')
    $$;
    create table public.app_state(
      id text primary key, payload jsonb not null,
      updated_at timestamptz not null default timezone('utc', now())
    );
    create table public.documents(
      id text primary key, user_id uuid not null references auth.users(id),
      title text not null, issuer text, due_date text, review_status text not null,
      reviewed_at text, updated_at timestamptz not null default timezone('utc', now())
    );
    create table public.reminders(
      id text primary key, user_id uuid not null references auth.users(id),
      title text not null, note text, room_id text, room_name text,
      reminder_group text not null, time_label text not null, priority text not null,
      assigned_to text, origin text not null, reminder_type text not null,
      time_zone text not null
    );
  `);
  for (const migration of migrations) {
    await database.exec(await readFile(
      new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8",
    ));
  }
  await database.query("insert into auth.users(id) values ($1), ($2)", [userId, otherId]);
  await database.query(`insert into public.documents
    (id,user_id,title,review_status) values ('document-1',$1,'Old title','needs-review'),
    ('other-document',$2,'Private title','needs-review')`, [userId, otherId]);
  return database;
}

async function useRole(database: PGlite, role: "authenticated" | "service_role") {
  await database.exec("reset role");
  await database.query("select set_config('request.jwt.claim.role', $1, false)", [role]);
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await database.exec(`set role ${role}`);
}

test("legacy mobile Office and notice writes are server-only", async () => {
  const database = await createDatabase();
  try {
    await useRole(database, "authenticated");
    const calls = [
      "select public.apply_mobile_bill_state(null::timestamptz,'{}'::jsonb,null::jsonb)",
      "select public.apply_mobile_insurance_state(null::timestamptz,'{}'::jsonb,null::jsonb)",
      "select public.apply_mobile_contract_state(null::timestamptz,'{}'::jsonb,null::jsonb)",
      "select public.apply_mobile_correspondence_state(null::timestamptz,'{}'::jsonb,null::jsonb)",
      "select public.apply_kitchen_notice_state(null::timestamptz,'{}'::jsonb,null::jsonb,null::text)",
      `select public.apply_mobile_office_state('${userId}',null,'{}','bill',null)`,
      `select public.apply_mobile_kitchen_notice_state('${userId}',null,'{}',null,null)`,
    ];
    for (const call of calls) {
      await assert.rejects(database.query(call), /permission denied|Service role required/i);
    }
  } finally {
    await database.close();
  }
});

test("server Office writes are revisioned and linked-document owner scoped", async () => {
  const database = await createDatabase();
  try {
    await useRole(database, "service_role");
    const first = await database.query<{ payload: unknown; updated_at: Date }>(
      "select * from public.apply_mobile_office_state($1,null,$2::jsonb,'bill',$3::jsonb)",
      [userId, JSON.stringify({ bills: { bills: [] } }), JSON.stringify({
        id: "document-1", title: "Energy", provider: "Supplier", dueDate: "2026-10-01",
      })],
    );
    assert.deepEqual(first.rows[0]?.payload, { bills: { bills: [] } });
    await database.exec("reset role");
    const document = await database.query<{ title: string; issuer: string }>(
      "select title,issuer from public.documents where id='document-1'",
    );
    assert.deepEqual(document.rows[0], { title: "Energy", issuer: "Supplier" });

    await useRole(database, "service_role");
    const conflict = await database.query(
      "select * from public.apply_mobile_office_state($1,$2,$3::jsonb,'contract',null)",
      [userId, "2000-01-01T00:00:00.000Z", JSON.stringify({ overwritten: true })],
    );
    assert.equal(conflict.rows.length, 0);
    await database.exec("reset role");
    const state = await database.query<{ payload: unknown }>(
      "select payload from public.app_state where id=$1", [userId],
    );
    assert.deepEqual(state.rows[0]?.payload, { bills: { bills: [] } });

    await useRole(database, "service_role");
    await database.query(
      "select * from public.apply_mobile_office_state($1,$2,$3::jsonb,'correspondence',$4::jsonb)",
      [userId, first.rows[0]?.updated_at, JSON.stringify({ correspondence: [] }), JSON.stringify({
        id: "other-document", title: "Tampered", sender: "Attacker", deadline: "",
      })],
    );
    await database.exec("reset role");
    const other = await database.query<{ title: string }>(
      "select title from public.documents where id='other-document'",
    );
    assert.equal(other.rows[0]?.title, "Private title");
  } finally {
    await database.close();
  }
});

test("server notice writes create only the nominated user's reminder", async () => {
  const database = await createDatabase();
  try {
    await useRole(database, "service_role");
    const reminder = {
      id: "notice-reminder-notice-one", title: "Bins", note: "Tonight",
      roomId: "kitchen", roomName: "Kitchen", group: "today", timeLabel: "Tonight",
      priority: "normal", assignedTo: "Family", sourceNoticeId: "notice-one",
    };
    await database.query(
      "select * from public.apply_mobile_kitchen_notice_state($1,null,$2::jsonb,$3::jsonb,null)",
      [userId, JSON.stringify({ kitchenNoticeboard: [] }), JSON.stringify(reminder)],
    );
    await database.exec("reset role");
    const stored = await database.query<{ user_id: string; title: string }>(
      "select user_id,title from public.reminders where id=$1", [reminder.id],
    );
    assert.deepEqual(stored.rows[0], { user_id: userId, title: "Bins" });
  } finally {
    await database.close();
  }
});
