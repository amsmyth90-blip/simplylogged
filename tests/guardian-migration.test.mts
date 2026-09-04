import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260901150000_guardian_findings.sql", import.meta.url);

test("Guardian findings are owner-scoped and anonymous access is revoked", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /alter table public\.guardian_findings enable row level security/i);
  assert.match(sql, /using \(user_id = auth\.uid\(\)\) with check \(user_id = auth\.uid\(\)\)/i);
  assert.match(sql, /revoke all on public\.guardian_findings from anon/i);
});

test("Guardian findings have stable deduplication and lifecycle states", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /unique \(user_id, dedupe_key\)/i);
  assert.match(sql, /household_id uuid references public\.households\(id\) on delete set null/i);
  assert.match(sql, /'ACTIVE', 'SNOOZED', 'DISMISSED', 'RESOLVED'/i);
  assert.match(sql, /rule_version integer not null/i);
});
