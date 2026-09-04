import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20260901120000_life_graph_integrity_and_proposals.sql", import.meta.url), "utf8");

test("makes capture proposals idempotent per user", () => {
  assert.match(sql, /add column if not exists dedupe_key text/i);
  assert.match(sql, /unique index if not exists action_requests_user_dedupe_idx[\s\S]*user_id, dedupe_key/i);
});

test("prevents cross-owner Life Graph relationships and facts", () => {
  assert.match(sql, /source_owner <> new\.user_id/i);
  assert.match(sql, /target_owner <> new\.user_id/i);
  assert.match(sql, /entity_owner <> new\.user_id/i);
  assert.match(sql, /action_requests_enforce_entity_owner/i);
});

test("bounds extracted confidence values at the database layer", () => {
  assert.match(sql, /life_relationships_confidence_bounds/i);
  assert.match(sql, /life_facts_confidence_bounds/i);
});
