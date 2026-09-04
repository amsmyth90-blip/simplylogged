import assert from "node:assert/strict";
import test from "node:test";

import { evaluateGuardianSource, evaluateGuardianSources } from "../lib/guardian/rules.ts";

const now = new Date("2026-09-01T12:00:00.000Z");
const source = (dueAt: string) => ({ resourceType: "vehicle", resourceId: "car-1", dateKey: "mot_expiry", reminderType: "mot_expiry", title: "MOT expiry", dueAt });

test("uses calm deterministic severity boundaries", () => {
  assert.equal(evaluateGuardianSource(source("2026-11-30T09:00:00.000Z"), now)?.severity, "INFO");
  assert.equal(evaluateGuardianSource(source("2026-10-01T09:00:00.000Z"), now)?.severity, "ATTENTION");
  assert.equal(evaluateGuardianSource(source("2026-09-08T09:00:00.000Z"), now)?.severity, "IMPORTANT");
  assert.equal(evaluateGuardianSource(source("2026-07-31T09:00:00.000Z"), now)?.severity, "URGENT");
});

test("ignores dates beyond the 90-day briefing horizon", () => {
  assert.equal(evaluateGuardianSource(source("2026-12-01T09:00:00.000Z"), now), null);
});

test("deduplicates multiple reminder offsets for one source date", () => {
  const candidates = evaluateGuardianSources([source("2026-10-01T09:00:00.000Z"), source("2026-10-01T09:00:00.000Z")], now);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.description, "The recorded date is in 30 days.");
});

test("rejects invalid dates without creating a finding", () => {
  assert.equal(evaluateGuardianSource(source("not-a-date"), now), null);
});

test("uses the source time zone across a British Summer Time boundary", () => {
  const lateUtc = new Date("2026-10-24T23:30:00.000Z");
  assert.equal(evaluateGuardianSource({ ...source("2026-10-25T09:00:00.000Z"), timeZone: "Europe/London" }, lateUtc)?.description, "The recorded date is today. Check the source record when convenient.");
});
