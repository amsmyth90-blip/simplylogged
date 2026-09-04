import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GUARDIAN_SCHEMA_VERSION,
  parseGuardianResponse,
} from "../packages/guardian/src/index.ts";

const finding = {
  id: "22c3957f-d43e-4e30-871a-2f2313553b4e",
  type: "document-renewal",
  severity: "ATTENTION",
  resourceType: "document",
  resourceId: "passport",
  title: "Passport renewal window",
  description: "The recorded date is in 30 days.",
  dueAt: "2026-10-01T09:00:00.000Z",
};

test("Guardian contract accepts a bounded versioned briefing", () => {
  const parsed = parseGuardianResponse({
    schemaVersion: GUARDIAN_SCHEMA_VERSION,
    findings: [finding],
  });
  assert.equal(parsed.findings[0]?.resourceId, "passport");
});

test("Guardian contract rejects unknown fields, invalid dates and excessive findings", () => {
  assert.throws(() => parseGuardianResponse({
    schemaVersion: GUARDIAN_SCHEMA_VERSION,
    findings: [{ ...finding, privateNote: "hidden" }],
  }), /unsupported fields/);
  assert.throws(() => parseGuardianResponse({
    schemaVersion: GUARDIAN_SCHEMA_VERSION,
    findings: [{ ...finding, dueAt: "invalid" }],
  }), /date is invalid/);
  assert.throws(() => parseGuardianResponse({
    schemaVersion: GUARDIAN_SCHEMA_VERSION,
    findings: Array.from({ length: 101 }, () => finding),
  }), /findings are invalid/);
});

test("Guardian evaluates every reminder visible through household policy", async () => {
  const source = await readFile(
    new URL("../lib/guardian/service.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /from\("reminders"\)/);
  assert.doesNotMatch(source, /from\("reminders"\)[\s\S]{0,240}\.eq\("user_id"/);
});
