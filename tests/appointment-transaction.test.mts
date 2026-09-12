import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";
const appointmentId = "44444444-4444-4444-8444-444444444444";
const deviceId = "55555555-5555-4555-8555-555555555555";
const appointment = { id: appointmentId, documentId, title: "Clinic visit", provider: "Example clinic", location: "Clinic",
  date: "2030-09-18", time: "10:30", timeZone: "Europe/London", durationMinutes: 30, status: "planned",
  preparationNotes: "Bring the letter", followUpNotes: "", reminderId: appointmentId, createdAt: "2026-09-12T10:00:00.000Z" };

for (const nativeId of ["text", "uuid"]) {
  test(`appointment transaction, private ownership and outbox with ${nativeId} IDs`, async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users(id uuid primary key);
        create function auth.role() returns text language sql as $$ select current_setting('request.role',true) $$;
        select set_config('request.role','service_role',false);
        create table public.app_state(id text primary key, payload jsonb not null, updated_at timestamptz default now());
        create table public.documents(id ${nativeId} primary key, user_id uuid not null, scope_kind text not null);
        create table public.reminders(id ${nativeId} primary key, user_id uuid not null, scope_kind text, scope_id uuid,
          title text not null, note text, room_id text, room_name text, reminder_group text, time_label text, priority text,
          document_id ${nativeId} references public.documents(id), due_at timestamptz, source_due_at timestamptz,
          origin text, reminder_type text, time_zone text);
      `);
      await db.exec(await readFile(new URL("../supabase/migrations/20260912130000_appointment_letter_delivery.sql", import.meta.url), "utf8"));
      await db.query("insert into auth.users values($1),($2)", [user, other]);
      await db.query("insert into public.documents values($1,$2,'USER')", [documentId, user]);
      await db.query("insert into public.appointment_devices(id,user_id,platform,token) values($1,$2,'ios',$3)", [deviceId, user, "a".repeat(64)]);
      const save = (owner = user, value = appointment) => db.query<{ result: { id: string; notificationsQueued: number } }>(
        "select public.save_letter_appointment($1,$2,$3,$4::jsonb,$5,$6,true) as result",
        [owner, value.id, documentId, JSON.stringify(value), "2030-09-18T09:30:00Z", "2030-09-17T09:30:00Z"]);
      await assert.rejects(save(other), /Private letter not found/);
      assert.equal((await db.query("select * from public.reminders")).rows.length, 0);
      const result = await save();
      assert.equal(result.rows[0]!.result.id, appointmentId);
      assert.equal(result.rows[0]!.result.notificationsQueued, 2);
      assert.equal((await save()).rows[0]!.result.notificationsQueued, 2);
      const state = await db.query<{ payload: { health: { appointments: unknown[]; timeline: unknown[] } } }>("select payload from app_state where id=$1", [user]);
      assert.equal(state.rows[0]!.payload.health.appointments.length, 1);
      assert.equal(state.rows[0]!.payload.health.timeline.length, 1);
      const reminders = await db.query<{ scope_kind: string; scope_id: string; document_id: string }>("select * from public.reminders");
      assert.equal(reminders.rows.length, 1);
      assert.equal(reminders.rows[0]!.scope_kind, "USER");
      assert.equal(reminders.rows[0]!.scope_id, user);
      assert.equal(reminders.rows[0]!.document_id, documentId);
      await assert.rejects(save(user, { ...appointment, title: "Changed retry" }), /different details/);
      const firstClaim = await db.query<{ id: string }>("select * from public.claim_appointment_notifications()");
      assert.equal(firstClaim.rows.length, 1, "only the added alert is due");
      assert.equal((await db.query("select * from public.claim_appointment_notifications()")).rows.length, 0, "live leases cannot be claimed twice");
      await db.query("update appointment_notifications set lease_until=now()-interval '1 minute' where id=$1", [firstClaim.rows[0]!.id]);
      assert.equal((await db.query("select * from public.claim_appointment_notifications()")).rows.length, 1);
      await db.query("update appointment_notifications set attempts=8,lease_until=now()-interval '1 minute' where id=$1", [firstClaim.rows[0]!.id]);
      assert.equal((await db.query("select * from public.claim_appointment_notifications()")).rows.length, 0);
      assert.equal((await db.query<{status:string}>("select status from appointment_notifications where id=$1", [firstClaim.rows[0]!.id])).rows[0]!.status, "failed");
      await db.exec("select set_config('request.role','authenticated',false)");
      await assert.rejects(save(), /Service role required/);
      await assert.rejects(db.query("select * from public.claim_appointment_notifications()"), /Service role required/);
      await db.exec("delete from auth.users");
      assert.equal((await db.query("select * from public.appointment_devices")).rows.length, 0);
      assert.equal((await db.query("select * from public.appointment_notifications")).rows.length, 0);
      assert.equal((await db.query("select * from public.appointment_imports")).rows.length, 0);
    } finally { await db.close(); }
  });
}
