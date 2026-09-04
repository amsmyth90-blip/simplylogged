import assert from "node:assert/strict";
import test from "node:test";

import {
  SEARCH_SCHEMA_VERSION,
  parseAskResponse,
  parseSearchResponse,
} from "../packages/search/src/index.ts";

const result = {
  id: "document:passport",
  category: "documents",
  title: "Passport",
  detail: "Travel",
  href: "/document/passport",
  dueAt: "2027-02-01T09:00:00.000Z",
  badge: "PDF",
};

test("search contract accepts a bounded versioned response", () => {
  const parsed = parseSearchResponse({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    query: "passport",
    filters: { category: "documents", date: "90" },
    results: [result],
  });
  assert.equal(parsed.results[0]?.id, "document:passport");
});

test("search contract rejects unknown fields and external links", () => {
  assert.throws(() => parseSearchResponse({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    query: "passport",
    filters: { category: "documents", date: "all" },
    results: [{ ...result, href: "https://attacker.example/record" }],
  }), /link is invalid/);
  assert.throws(() => parseSearchResponse({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    query: "passport",
    filters: { category: "documents", date: "all" },
    results: [{ ...result, privateText: "hidden" }],
  }), /unsupported fields/);
});

test("Ask contract caps citations and requires an exact schema version", () => {
  const response = parseAskResponse({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    answer: "Your passport is due in February.",
    citations: [result],
    usedAI: true,
  });
  assert.equal(response.citations.length, 1);
  assert.throws(() => parseAskResponse({
    schemaVersion: 2,
    answer: "Answer",
    citations: [],
    usedAI: false,
  }), /update DiaryDock/);
});
