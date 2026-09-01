import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bootstrap queries have explicit per-account bounds", async () => {
  const route = await readFile(new URL("../app/api/diarydock/bootstrap/route.ts", import.meta.url), "utf8");
  assert.match(route, /MAX_BOOTSTRAP_DOCUMENTS = 2_000/);
  assert.match(route, /MAX_BOOTSTRAP_REMINDERS = 5_000/);
  assert.match(route, /\.limit\(MAX_BOOTSTRAP_DOCUMENTS \+ 1\)/);
  assert.match(route, /\.limit\(MAX_BOOTSTRAP_REMINDERS \+ 1\)/);
  assert.match(route, /status: 507/);
});

test("rate-limit cleanup is separated from the hot database function", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260901230000_scalable_document_uploads.sql", import.meta.url), "utf8");
  const rateFunction = migration.slice(
    migration.indexOf("create or replace function public.check_rate_limit"),
    migration.indexOf("create or replace function public.cleanup_rate_limit_buckets"),
  );
  assert.doesNotMatch(rateFunction, /delete from public\.rate_limit_buckets/i);
  assert.match(migration, /create or replace function public\.cleanup_rate_limit_buckets\(\)/i);
});

test("storage reservations serialise quota checks and quarantine unsigned files", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260901230000_scalable_document_uploads.sql", import.meta.url), "utf8");
  assert.match(migration, /diarydock-document-quarantine/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /STORAGE_LIMIT_EXCEEDED/);
  assert.match(migration, /storage_limit_bytes between 1048576 and 10737418240/);
});
