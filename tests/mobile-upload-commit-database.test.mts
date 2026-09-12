import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL(
  "../supabase/migrations/20260901233600_mobile_document_upload_commit.sql",
  import.meta.url,
);

for (const [documentType, reminderType] of [["text", "text"], ["uuid", "text"], ["uuid", "uuid"]]) {
test(`mobile upload commit preserves ${documentType} documents and ${reminderType} reminders`, async () => {
  const database = new PGlite();
  await database.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.document_upload_reservations (
      id uuid primary key, user_id uuid not null, document_id uuid not null,
      expected_bytes bigint not null, quarantine_path text not null, final_path text not null,
      mime_type text not null, expires_at timestamptz not null,
      committed_at timestamptz, cancelled_at timestamptz
    );
    create table public.documents (
      id ${documentType} primary key, user_id uuid not null, title text not null, category text not null,
      kind text not null, size_label text not null, room_id text, room_name text,
      issuer text, due_date text, storage_bucket text, storage_path text,
      original_file_name text, mime_type text, extraction_summary text, extracted_text text,
      action_items jsonb not null, confidence numeric,
      review_status text not null, review_reasons jsonb not null,
      emergency_visible boolean not null
    );
    create table public.reminders (
      id ${reminderType} primary key, user_id uuid not null, title text not null, note text,
      room_id text, room_name text, reminder_group text not null, time_label text not null,
      priority text not null, document_id ${documentType} references public.documents(id), document_title text
    );
  `);
  await database.exec(await readFile(migrationUrl, "utf8"));
  await database.exec(await readFile(new URL("../supabase/migrations/20260911141000_upload_native_id_types.sql", import.meta.url), "utf8"));
  const userId = "11111111-1111-4111-8111-111111111111";
  const reservationId = "22222222-2222-4222-8222-222222222222";
  const documentId = "33333333-3333-4333-8333-333333333333";
  const reminderId = "44444444-4444-4444-8444-444444444444";
  await database.query(`insert into public.document_upload_reservations values (
    $1::uuid, $2::uuid, $3::uuid, 2048,
    $2::text || '/' || $1::text || '/' || $3::text || '/scan.pdf',
    $2::text || '/' || $3::text || '/scan.pdf',
    'application/pdf', now() + interval '1 hour', null, null
  )`, [reservationId, userId, documentId]);

  assert.equal((await database.query(
    "select public.commit_mobile_document_upload($1,$2,$3::jsonb) as committed",
    ["55555555-5555-4555-8555-555555555555", reservationId, JSON.stringify({ title: "Wrong owner", category: "Finance", roomName: "Office" })],
  )).rows[0]?.committed, false);
  assert.equal((await database.query("select count(*)::int as count from public.documents")).rows[0]?.count, 0);
  await database.exec("set role authenticated");
  await assert.rejects(database.query(
    "select public.commit_mobile_document_upload($1,$2,$3::jsonb)",
    [userId,reservationId,JSON.stringify({ title:"Not a server",category:"Finance",roomName:"Office" })],
  ), /permission denied/);
  await database.exec("reset role");

  const committed = await database.query<{ committed: boolean }>(
    "select public.commit_mobile_document_upload($1, $2, $3::jsonb) as committed",
    [userId, reservationId, JSON.stringify({
      title: "Home policy",
      category: "Home & Property",
      roomName: "Safe Room",
      issuer: "Example Insurer",
      dueDate: "2027-09-01",
      summary: "Annual policy schedule",
      extractedText: "Policy schedule",
      confidence: 0.94,
      actionItems: ["Review before renewal"],
      reminder: { id: reminderId, title: "Renew home policy", timeLabel: "Next August" },
    })],
  );
  assert.equal(committed.rows[0]?.committed, true);
  const document = await database.query<Record<string, unknown>>(
    "select * from public.documents where id = $1",
    [documentId],
  );
  assert.equal(document.rows[0]?.user_id, userId);
  assert.equal(document.rows[0]?.room_id, "safe-room");
  assert.equal(document.rows[0]?.issuer, "Example Insurer");
  assert.equal(document.rows[0]?.storage_path, `${userId}/${documentId}/scan.pdf`);
  assert.equal((await database.query(
    "select public.commit_mobile_document_upload($1, $2, $3::jsonb) as committed",
    [userId, reservationId, JSON.stringify({
      title: "Home policy", category: "Home & Property", roomName: "Safe Room",
      reminder: { id: reminderId, title: "Renew home policy", timeLabel: "Next August" },
    })],
  )).rows[0]?.committed, true);
  assert.equal((await database.query("select count(*)::int as count from public.reminders")).rows[0]?.count, 1);
  await database.close();
});
}
