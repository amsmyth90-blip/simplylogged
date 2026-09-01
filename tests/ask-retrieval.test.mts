import assert from "node:assert/strict";
import test from "node:test";

import { deterministicAskAnswer, retrieveAskCitations } from "../lib/ask/retrieval.ts";
import type { SearchCandidate } from "../lib/search/results.ts";

const now = new Date("2026-09-01T12:00:00.000Z");
const candidates: SearchCandidate[] = [
  { id: "vehicle:1:mot", category: "vehicles", domains: ["vehicles"], title: "Family car MOT", detail: "AB12 CDE", href: "/garage/vehicles/1", dueAt: "2026-10-18T09:00:00.000Z", badge: "MOT", searchText: "family car mot expiry due" },
  { id: "vehicle:1:insurance", category: "vehicles", domains: ["vehicles", "insurance"], title: "Family car insurance", detail: "AB12 CDE", href: "/garage/vehicles/1", dueAt: "2026-11-20T09:00:00.000Z", badge: "Insurance", searchText: "family car vehicle insurance renewal expiry due" },
  { id: "asset:2:warranty", category: "assets", domains: ["assets", "home"], title: "Washing machine warranty", detail: "Utility room", href: "/assets/2", dueAt: "2027-01-10T09:00:00.000Z", badge: "Warranty", searchText: "washing machine warranty guarantee expiry due" },
  { id: "private-other-user", category: "documents", domains: ["documents"], title: "Someone else's passport", detail: "Private", href: "/document/private", dueAt: "2026-10-01T09:00:00.000Z", searchText: "passport expiry" }
];

test("selects the matching vehicle date rather than another date on the same vehicle", () => {
  const result = retrieveAskCitations(candidates.slice(0, 3), "When does my car insurance expire?", now);
  assert.equal(result[0]?.id, "vehicle:1:insurance");
});

test("applies explicit time horizons before creating model context", () => {
  const result = retrieveAskCitations(candidates.slice(0, 3), "Which important things expire in the next three months?", now);
  assert.deepEqual(result.map((citation) => citation.id), ["vehicle:1:mot", "vehicle:1:insurance"]);
});

test("cannot retrieve a record that was not present in the authorised candidate set", () => {
  const result = retrieveAskCitations(candidates.slice(0, 3), "When does someone else's passport expire?", now);
  assert.equal(result.some((citation) => citation.id === "private-other-user"), false);
});

test("caps minimal retrieval and produces traceable deterministic fallback", () => {
  const many = Array.from({ length: 20 }, (_, index): SearchCandidate => ({ ...candidates[0], id: `mot-${index}`, title: `Car ${index} MOT` }));
  const result = retrieveAskCitations(many, "Which MOT records expire?", now, 50);
  assert.equal(result.length, 8);
  assert.match(deterministicAskAnswer(result), /Open the linked records/);
});
