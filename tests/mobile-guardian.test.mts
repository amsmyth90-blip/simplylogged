import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { LocalRecord, OfflineStore } from "../packages/offline-store/src/index.ts";
import { loadLocalGuardian } from "../apps/mobile/src/guardian/local-guardian.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("offline Guardian derives a briefing only from encrypted system reminder projections", async () => {
  const record: LocalRecord = {
    id: "reminder-1",
    entityType: "reminder",
    scope: { kind: "USER", id: "owner" },
    revision: "1",
    schemaVersion: 1,
    updatedAt: "2026-09-01T09:00:00.000Z",
    deletedAt: null,
    payload: {
      title: "Passport renewal window",
      group: "week",
      timeLabel: "This week",
      priority: "normal",
      origin: "SYSTEM_GENERATED",
      reminderType: "document-renewal",
      timeZone: "Europe/London",
      sourceResourceType: "document",
      sourceResourceId: "passport",
      sourceDateKey: "passport-expiry",
      sourceDueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    },
    syncState: "CLEAN",
  };
  const store = {
    listRecords: async () => [record],
  } as unknown as OfflineStore;
  const findings = await loadLocalGuardian(store);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.id.startsWith("local:"), true);
  assert.equal(findings[0]?.resourceId, "passport");
});

test("mobile Guardian uses hybrid auth, exact bounded actions and safe observations", async () => {
  const [route, service, hook, app] = await Promise.all([
    read("app/api/mobile/guardian/route.ts"),
    read("lib/guardian/service.ts"),
    read("apps/mobile/src/guardian/use-guardian.ts"),
    read("apps/mobile/src/signed-in-screens.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 2 \* 1024\)/);
  assert.match(route, /Object\.keys\(body\)\.some/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.match(service, /\.eq\("user_id", userId\)/);
  assert.match(service, /parseGuardianResponse/);
  assert.match(hook, /loadLocalGuardian/);
  assert.match(app, /import\("@mobile\/guardian\/GuardianScreen"\)/);
});
