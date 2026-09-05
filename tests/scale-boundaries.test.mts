import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bootstrap loads structured records through bounded resumable pages", async () => {
  const [route, pages, client, migration] = await Promise.all([
    readFile(new URL("../app/api/diarydock/bootstrap/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-record-page-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-record-page-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260904206000_desktop_record_pagination.sql", import.meta.url), "utf8"),
  ]);
  assert.match(route, /loadDiaryDockRecordPage/);
  assert.match(route, /documentCursor:/);
  assert.match(route, /reminderCursor:/);
  assert.doesNotMatch(route, /status: 507/);
  assert.match(pages, /kind === "documents" \? 25 : 200/);
  assert.match(pages, /created_at/);
  assert.match(pages, /document_permissions/);
  assert.match(client, /MAX_PAGES_PER_KIND = 500/);
  assert.match(client, /readBoundedJsonResponse/);
  assert.match(migration, /documents_owner_created_page_idx/);
  assert.match(migration, /reminders_owner_created_page_idx/);
});

test("desktop persistence uses bootstrap revisions and refuses lost updates", async () => {
  const [bootstrap, route, repository, provider, migration] = await Promise.all([
    readFile(new URL("../app/api/diarydock/bootstrap/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/diarydock/state/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/DiaryDockDataProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260904205000_desktop_state_service_boundary.sql", import.meta.url), "utf8"),
  ]);
  assert.match(bootstrap, /select\("payload,updated_at"\)/);
  assert.match(bootstrap, /privateRevision:/);
  assert.match(bootstrap, /householdRevision:/);
  assert.match(route, /apply_diarydock_state/);
  assert.match(route, /ensureServiceHousehold[\s\S]+apply_diarydock_state/);
  assert.match(route, /isSameOrigin/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(repository, /\/api\/diarydock\/state/);
  assert.match(repository, /DiaryDockRepositoryConflictError/);
  assert.doesNotMatch(repository, /from\("app_state"\)\.(?:insert|update|upsert)/);
  assert.doesNotMatch(repository, /from\("household_state"\)\.(?:insert|update|upsert)/);
  assert.match(migration, /for update/);
  assert.match(migration, /input_expected_private_revision/);
  assert.match(migration, /input_expected_household_revision/);
  assert.match(migration, /revoke insert, update on table public\.app_state from authenticated/);
  assert.match(migration, /revoke insert, update on table public\.household_state from authenticated/);
  assert.match(provider, /repository\.adoptRevisions/);
  assert.match(provider, /Reload secure copy/);
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
