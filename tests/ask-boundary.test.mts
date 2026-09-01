import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../app/api/ask/route.ts", import.meta.url);
const providerPath = new URL("../lib/ask/openai.ts", import.meta.url);
const retrievalPath = new URL("../lib/ask/retrieval.ts", import.meta.url);

test("Ask authenticates and performs RLS-backed retrieval before the model call", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /loadAuthorizedSearchCandidates\(supabase, authData\.user\.id\)/);
  assert.match(route, /retrieveAskCitations\(authorized\.candidates, question\)/);
  assert.match(route, /createAskAnswer\(/);
  assert.ok(route.indexOf("loadAuthorizedSearchCandidates") < route.lastIndexOf("createAskAnswer"));
});

test("Ask model context is minimal, structured, non-persistent and has no action tools", async () => {
  const provider = await readFile(providerPath, "utf8");
  assert.match(provider, /store: false/);
  assert.match(provider, /type: "json_schema"/);
  assert.match(provider, /sourceRef/);
  assert.doesNotMatch(provider, /href:|searchText|ownerId|userId|extractedText|tools:/);
});

test("Ask is bounded, private, rate-limited and does not log questions", async () => {
  const route = await readFile(routePath, "utf8");
  const retrieval = await readFile(retrievalPath, "utf8");
  assert.match(route, /status: 401/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /question\.length < 2 \|\| question\.length > 300/);
  assert.match(route, /contentLength > 4_096/);
  assert.match(retrieval, /Math\.min\(limit, 8\)/);
  assert.doesNotMatch(route, /console\.(log|info|warn|error)/);
});
