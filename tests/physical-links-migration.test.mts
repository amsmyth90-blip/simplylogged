import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260901170000_physical_links_and_assets.sql", import.meta.url);

test("Physical Links store only opaque lookup IDs and secret verifiers", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /public_id text not null unique/i);
  assert.match(sql, /secret_hash text not null check \(secret_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/i);
  assert.doesNotMatch(sql, /secret text/i);
  assert.match(sql, /revoke insert, update, delete on public\.physical_links from authenticated/i);
});

test("resolver fails closed through the normal resource permission function", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /status = 'ACTIVE'/i);
  assert.match(sql, /expires_at is null or expires_at > now\(\)/i);
  assert.match(sql, /can_access_shared_resource\(link_record\.resource_type, link_record\.resource_id::text, link_record\.owner_id, 'VIEW'\)/i);
  assert.match(sql, /status in \('ACTIVE', 'DISABLED', 'REVOKED', 'REPLACED'\)/i);
});

test("asset rows use owner and permission-aware RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /alter table public\.assets enable row level security/i);
  assert.match(sql, /owner_id = auth\.uid\(\) or public\.can_access_shared_resource\('asset', id::text, owner_id, 'VIEW'\)/i);
  assert.match(sql, /revoke all on public\.assets, public\.physical_links from anon/i);
  assert.match(sql, /new\.owner_id <> old\.owner_id or new\.household_id is distinct from old\.household_id/i);
});
