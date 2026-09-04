import assert from "node:assert/strict";
import test from "node:test";

import { filterAndRankSearchResults, type SearchCandidate } from "../lib/search/results.ts";

const candidates: SearchCandidate[] = [
  { id: "doc", category: "documents", domains: ["documents", "pets"], title: "Vaccination record", detail: "Garden", href: "/document/doc", dueAt: "2026-09-20T09:00:00.000Z", searchText: "vaccination record garden pet" },
  { id: "car", category: "vehicles", domains: ["vehicles"], title: "Family car", detail: "MOT", href: "/garage/vehicles/car", dueAt: "2026-12-20T09:00:00.000Z", searchText: "family car mot" },
  { id: "expired", category: "insurance", domains: ["insurance"], title: "Old cover", detail: "Expired", href: "/office/insurance/expired", dueAt: "2026-08-01T09:00:00.000Z", searchText: "old cover expired" }
];

test("ranks title matches ahead of secondary field matches", () => {
  assert.deepEqual(filterAndRankSearchResults(candidates, "vaccination").map((item) => item.id), ["doc"]);
});

test("uses domains so pet documents remain filterable without duplication", () => {
  assert.deepEqual(filterAndRankSearchResults(candidates, "", "pets").map((item) => item.id), ["doc"]);
});

test("applies upcoming and expired date filters at their boundaries", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");
  assert.deepEqual(filterAndRankSearchResults(candidates, "", "all", "30", now).map((item) => item.id), ["doc"]);
  assert.deepEqual(filterAndRankSearchResults(candidates, "", "all", "expired", now).map((item) => item.id), ["expired"]);
});

test("never returns internal search text to the browser schema", () => {
  const [result] = filterAndRankSearchResults(candidates, "car");
  assert.equal("searchText" in (result as unknown as Record<string, unknown>), false);
  assert.equal("domains" in (result as unknown as Record<string, unknown>), false);
});
