import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../app/api/search/route.ts", import.meta.url);

test("search retrieves through RLS-backed user tables before ranking", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /supabase\.from\("documents"\)/);
  assert.match(source, /supabase\.from\("reminders"\)/);
  assert.match(source, /supabase\.from\("assets"\)/);
  assert.match(source, /supabase\.from\("app_state"\).*\.eq\("id", authData\.user\.id\)/s);
  assert.match(source, /filterAndRankSearchResults\(candidates/);
});

test("search does not retrieve high-sensitivity OCR, notes, phone or email fields", async () => {
  const source = await readFile(routePath, "utf8");
  assert.doesNotMatch(source, /extracted_text|extraction_summary|emergency_notes|contact\.phone|contact\.email|contact\.notes/);
  assert.doesNotMatch(source, /select\([^\n]*\bnote\b/);
});

test("search responses are private and fail closed when signed out", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /status: 401/);
  assert.match(source, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(source, /checkSharedRateLimit/);
});
