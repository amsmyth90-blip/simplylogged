import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { nextProgressiveLimit } from
  "../apps/mobile/src/components/progressive-list-model.ts";
import { readModelCacheKey } from
  "../apps/mobile/src/data/offline/read-model-cache-key.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("progressive record limits advance without exceeding the available records", () => {
  assert.equal(nextProgressiveLimit(6, 6, 17), 12);
  assert.equal(nextProgressiveLimit(12, 6, 17), 17);
  assert.equal(nextProgressiveLimit(17, 6, 17), 17);
});

test("detail cache keys are deterministic, namespaced and database bounded", async () => {
  const first = await readModelCacheKey("handover-detail", "OWNER:ASSET:123");
  const repeated = await readModelCacheKey("handover-detail", "OWNER:ASSET:123");
  const other = await readModelCacheKey("kitchen-recipe", "OWNER:ASSET:123");
  assert.equal(first, repeated);
  assert.notEqual(first, other);
  assert.ok(first.length <= 64);
  assert.match(first, /^handover-detail-[0-9a-f]{32}$/);
  await assert.rejects(readModelCacheKey("Invalid Namespace", "value"), /invalid/);
});

test("specialist mobile rooms keep every encrypted record reachable", async () => {
  const [component, attic, garden, health, wills, storyEditor, trusted, main] = await Promise.all([
    read("apps/mobile/src/components/ProgressiveRecordList.tsx"),
    read("apps/mobile/src/attic/AtticRecords.tsx"),
    read("apps/mobile/src/garden/GardenRecords.tsx"),
    read("apps/mobile/src/health/HealthScreen.tsx"),
    read("apps/mobile/src/wills/SafeRoomScreen.tsx"),
    read("apps/mobile/src/attic/FamilyStoryEditor.tsx"),
    read("apps/mobile/src/emergency-access/TrustedAccessScreen.tsx"),
    read("apps/mobile/src/main.tsx"),
  ]);
  assert.match(component, /items\.slice\(0, limit\)/);
  assert.match(component, /Show .* more/);
  for (const source of [attic, garden, health, wills, storyEditor, trusted]) {
    assert.match(source, /ProgressiveRecordList/);
  }
  assert.doesNotMatch(attic, /documents\.slice\(0, 12\)|reminders\.slice\(0, 8\)/);
  assert.doesNotMatch(garden, /documents\.slice\(0, 8\)|reminders\.slice\(0, 8\)/);
  assert.doesNotMatch(health, /documents\.slice\(0, 6\)/);
  assert.doesNotMatch(wills, /documents\.slice\(0, 6\)/);
  assert.doesNotMatch(storyEditor, /imageDocuments\.slice\(0, 24\)/);
  assert.doesNotMatch(trusted, /notifications\.slice\(0, 8\)/);
  assert.match(main, /progressive-record-list\.css/);
});
