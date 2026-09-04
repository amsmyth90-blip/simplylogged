import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../app/api/ask/route.ts", import.meta.url);
const providerPath = new URL("../lib/ask/openai.ts", import.meta.url);
const servicePath = new URL("../lib/ask/answer-server.ts", import.meta.url);
const retrievalPath = new URL("../packages/search/src/ask.ts", import.meta.url);

test("Ask authenticates and performs RLS-backed retrieval before the model call", async () => {
  const route = await readFile(routePath, "utf8");
  const service = await readFile(servicePath, "utf8");
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /loadAuthorizedSearchCandidates\(supabase, authData\.user\.id\)/);
  assert.match(route, /answerAuthorizedQuestion\(authorized\.candidates, question\)/);
  assert.match(service, /retrieveAskCitations\(candidates, question\)/);
  assert.match(service, /createAskAnswer\(/);
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
  assert.match(route, /readBoundedJson\(request, 4_096\)/);
  assert.match(route, /Object\.keys\(body\)\.some/);
  assert.match(retrieval, /Math\.min\(limit, 8\)/);
  assert.doesNotMatch(route, /console\.(log|info|warn|error)/);
});
