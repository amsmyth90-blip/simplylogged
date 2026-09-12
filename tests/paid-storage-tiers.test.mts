import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PRICING_PLANS } from "../lib/pricing.ts";

test("paid storage quotas enforce capacity, reservations and server-only plan changes", async () => {
  const db = new PGlite();
  const user = "11111111-1111-4111-8111-111111111111";
  const document = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create table storage.buckets(id text primary key, name text, public boolean,
        file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text, name text, metadata jsonb);
    `);
    const original = await readFile(new URL("../supabase/migrations/20260901230000_scalable_document_uploads.sql", import.meta.url), "utf8");
    await db.exec(original.slice(0, original.indexOf("create or replace function public.check_rate_limit(")));
    await db.query("insert into auth.users values ($1)", [user]);
    await db.query("insert into public.user_storage_entitlements(user_id) values ($1)", [user]);
    await db.exec(await readFile(new URL("../supabase/migrations/20260911121000_paid_storage_tiers.sql", import.meta.url), "utf8"));
    const reserve = () => db.query("select * from public.reserve_document_upload($1,$2,'scan.pdf','application/pdf',1)", [user, document]);
    assert.equal((await db.query("select tier from public.user_storage_entitlements")).rows[0]?.tier, "none");
    await assert.rejects(reserve(), /STORAGE_LIMIT_EXCEEDED/);
    await db.exec("delete from public.user_storage_entitlements");
    await assert.rejects(reserve(), /STORAGE_LIMIT_EXCEEDED/);
    for (const plan of PRICING_PLANS) {
      await db.query("select public.set_user_storage_plan($1,$2)", [user, plan.id.toLowerCase()]);
      const summary = await db.query<{ storage_limit_bytes: number }>("select * from public.get_user_storage_summary($1)", [user]);
      assert.equal(Number(summary.rows[0]?.storage_limit_bytes), plan.storageBytes);
      await db.exec("delete from storage.objects; delete from public.document_upload_reservations;");
      await db.query("insert into storage.objects values ('diarydock-documents',$1,$2)", [`${user}/stored.pdf`, { size: plan.storageBytes - 1 }]);
      await reserve(); // The final byte fits exactly.
      await assert.rejects(reserve(), /STORAGE_LIMIT_EXCEEDED/); // Reserved bytes count too.
    }
    await db.query("select public.set_user_storage_plan($1,'starter')", [user]);
    await assert.rejects(reserve(), /STORAGE_LIMIT_EXCEEDED/); // Downgrade preserves files, blocks new uploads.
    assert.equal((await db.query("select count(*)::int as count from storage.objects")).rows[0]?.count, 1);
    await assert.rejects(db.query("select public.set_user_storage_plan($1,'free')", [user]), /Invalid storage plan/);
    await assert.rejects(db.query("update public.user_storage_entitlements set storage_limit_bytes=1"), /check constraint/);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select public.set_user_storage_plan($1,'family')", [user]), /permission denied/);
  } finally {
    await db.close();
  }
});
