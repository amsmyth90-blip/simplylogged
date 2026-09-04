import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { parseMailboxMutation, parseMailboxSnapshot } from "../packages/mailbox/src/index.ts";

const userId = "10000000-0000-4000-8000-000000000001";
const otherId = "20000000-0000-4000-8000-000000000002";
const itemId = "30000000-0000-4000-8000-000000000003";
const secondItemId = "40000000-0000-4000-8000-000000000004";
const revision = "2026-09-04T10:00:00.000Z";

test("Mailbox contracts are exact, bounded and owner-free", () => {
  const snapshot = { schemaVersion: 1, revision, items: [{ id: itemId,
    title: "Home insurance renewal", source: "Aviva", kind: "Letter",
    suggestedRoom: "Office", routeStatus: "new", documentId: "doc-1",
    receivedAt: revision, updatedAt: revision }] };
  assert.deepEqual(parseMailboxSnapshot(snapshot), snapshot);
  assert.throws(() => parseMailboxSnapshot({ ...snapshot,
    items: [{ ...snapshot.items[0], userId }] }));
  assert.throws(() => parseMailboxSnapshot({ ...snapshot,
    items: Array.from({ length: 301 }, (_, index) => ({ ...snapshot.items[0], id: `${itemId}-${index}` })) }));
  assert.deepEqual(parseMailboxMutation({ operation: "ROUTE_ITEM", itemId,
    itemRevision: revision, action: "MAKE_REMINDER" }), {
    operation: "ROUTE_ITEM", itemId, itemRevision: revision, action: "MAKE_REMINDER",
  });
  assert.throws(() => parseMailboxMutation({ operation: "ROUTE_ITEM", itemId,
    itemRevision: revision, action: "IGNORE", ownerId: otherId }));
});

async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.role() returns text language sql stable as $$
      select coalesce(current_setting('request.jwt.claim.role', true), '')
    $$;
    create function public.touch_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = timezone('utc', now()); return new; end
    $$;
    create table public.app_state (
      id text primary key, payload jsonb not null default '{}',
      updated_at timestamptz not null default timezone('utc', now())
    );
    create table public.documents (
      id text primary key, user_id uuid not null, title text not null default 'Document',
      category text not null default 'Other', issuer text, storage_bucket text, storage_path text,
      room_id text, room_name text
    );
    create table public.reminders (
      id uuid primary key, user_id uuid not null, title text not null, note text,
      room_id text, room_name text, reminder_group text, time_label text, priority text,
      origin text, reminder_type text, source_resource_type text, source_resource_id text,
      source_date_key text, time_zone text
    );
    create table public.life_inbox_items (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      source_type text not null, status text not null default 'received', title text not null,
      source_label text, document_id text references public.documents(id) on delete set null,
      storage_bucket text, storage_path text, suggested_room text, fingerprint text,
      created_at timestamptz not null default timezone('utc', now()),
      updated_at timestamptz not null default timezone('utc', now()),
      unique(user_id, fingerprint)
    );
  `);
  await db.query("insert into auth.users(id) values ($1), ($2)", [userId, otherId]);
  await db.query(`insert into public.app_state(id,payload) values ($1,$2)`, [userId,
    JSON.stringify({ mailboxItems: [{ id: "legacy-one", title: "Old letter", source: "Bank",
      kind: "Statement", suggestedRoom: "Office", routeStatus: "new" }] })]);
  const migration = await readFile("supabase/migrations/20260904130000_mobile_mailbox_foundation.sql", "utf8");
  await db.exec(migration);
  return db;
}

test("Mailbox migration preserves legacy items and actions are service-only and atomic", async () => {
  const db = await createDatabase();
  try {
    const legacy = await db.query<{ title: string; route_status: string }>(
      "select title,route_status from life_inbox_items where source_type='legacy'",
    );
    assert.deepEqual(legacy.rows, [{ title: "Old letter", route_status: "new" }]);
    await db.query(`insert into documents
      (id,user_id,title,category,room_name) values ('doc-mailbox',$1,'Scanned form','Forms','Mailbox')`,
    [userId]);
    const captured = await db.query<{ source_type: string; suggested_room: string }>(
      "select source_type,suggested_room from life_inbox_items where document_id='doc-mailbox'",
    );
    assert.deepEqual(captured.rows, [{ source_type: "capture", suggested_room: "Office" }]);
    await db.query("insert into documents(id,user_id) values ('doc-1',$1)", [userId]);
    await db.query(`insert into life_inbox_items
      (id,user_id,source_type,status,title,source_label,document_id,suggested_room,item_kind,
       route_status,fingerprint,created_at,updated_at)
      values ($1,$2,'email','needs_review','Energy bill','Supplier','doc-1','Kitchen','Bill',
       'new','one',$3,$3),($4,$2,'email','needs_review','Policy','Insurer','doc-1','Office','Letter',
       'new','two',$3,$3)`, [itemId, userId, revision, secondItemId]);

    await db.query("select set_config('request.jwt.claim.role','service_role',false)");
    const reminder = await db.query<{ apply_mobile_mailbox_action: string }>(
      "select apply_mobile_mailbox_action($1,$2,$3,'MAKE_REMINDER')",
      [userId, itemId, revision]);
    assert.equal(reminder.rows[0]?.apply_mobile_mailbox_action, "OK");
    const effects = await db.query<{ route_status: string; priority: string; user_id: string }>(`
      select inbox.route_status, reminder.priority, reminder.user_id::text
      from life_inbox_items inbox join reminders reminder
        on reminder.source_resource_id = inbox.id::text where inbox.id = $1`, [itemId]);
    assert.deepEqual(effects.rows, [{ route_status: "reminder", priority: "high", user_id: userId }]);
    const replay = await db.query<{ apply_mobile_mailbox_action: string }>(
      "select apply_mobile_mailbox_action($1,$2,$3,'IGNORE')", [userId, itemId, revision]);
    assert.equal(replay.rows[0]?.apply_mobile_mailbox_action, "CONFLICT");

    const routed = await db.query<{ apply_mobile_mailbox_action: string }>(
      "select apply_mobile_mailbox_action($1,$2,$3,'SEND_TO_ROOM')",
      [userId, secondItemId, revision]);
    assert.equal(routed.rows[0]?.apply_mobile_mailbox_action, "OK");
    const document = await db.query<{ room_id: string; room_name: string }>(
      "select room_id,room_name from documents where id='doc-1'",
    );
    assert.deepEqual(document.rows, [{ room_id: "office", room_name: "Office" }]);
    const crossUser = await db.query<{ apply_mobile_mailbox_action: string }>(
      "select apply_mobile_mailbox_action($1,$2,$3,'IGNORE')",
      [otherId, secondItemId, revision]);
    assert.equal(crossUser.rows[0]?.apply_mobile_mailbox_action, "NOT_FOUND");

    await db.exec("set role authenticated");
    await assert.rejects(() => db.query(
      "select apply_mobile_mailbox_action($1,$2,$3,'IGNORE')",
      [userId, secondItemId, revision]));
    await db.exec("reset role");
  } finally { await db.close(); }
});

test("Mobile Mailbox is bounded, observed, encrypted offline and specialist-routed", async () => {
  const [route, server, client, hook, screen, router, screens, migration] = await Promise.all([
    readFile("app/api/mobile/mailbox/route.ts", "utf8"),
    readFile("lib/mailbox/mobile-server.ts", "utf8"),
    readFile("apps/mobile/src/mailbox/mailbox-client.ts", "utf8"),
    readFile("apps/mobile/src/mailbox/use-mailbox.ts", "utf8"),
    readFile("apps/mobile/src/mailbox/MailboxScreen.tsx", "utf8"),
    readFile("apps/mobile/src/SignedInRoom.tsx", "utf8"),
    readFile("apps/mobile/src/signed-in-screens.ts", "utf8"),
    readFile("supabase/migrations/20260904130000_mobile_mailbox_foundation.sql", "utf8"),
  ]);
  assert.match(route, /authenticateHybridRequest/); assert.match(route, /readBoundedJson/);
  assert.match(route, /checkServerRateLimit/); assert.match(route, /RequestObservation/);
  assert.doesNotMatch(route, /body\.userId|body\.ownerId/);
  assert.match(server, /\.eq\("user_id", userId\)/); assert.match(server, /\.limit\(300\)/);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(hook, /tryPutReadModel\(store/); assert.match(hook, /tryGetReadModel\(store/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  for (const action of ["SAVE_TO_FILES", "MAKE_REMINDER", "SEND_TO_ROOM", "IGNORE"])
    assert.ok(screen.includes(action) || (await readFile("apps/mobile/src/mailbox/MailboxItemCard.tsx", "utf8")).includes(action));
  assert.match(router, /profile\.id === "mailbox"/);
  assert.match(screens, /@mobile\/mailbox\/MailboxScreen/);
  assert.match(migration, /Service role required/);
  assert.match(migration, /revoke all .*from public, anon, authenticated/is);
});
