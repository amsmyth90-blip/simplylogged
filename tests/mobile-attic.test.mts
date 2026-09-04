import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Attic is owner-scoped, bounded, observable and revision-safe", async () => {
  const [route, service, client] = await Promise.all([
    read("app/api/mobile/attic/route.ts"),
    read("lib/attic/mobile-snapshot-server.ts"),
    read("apps/mobile/src/attic/attic-client.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 32 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /storyCursor\(request\)/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(service, /\.eq\("updated_at", current\.data\.updated_at\)/);
  assert.match(service, /result\.status === "IDEMPOTENT"/);
  assert.match(service, /status: "CONFLICT"/);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(client, /getSecureRuntime\(\)\.apiOrigin/);
  assert.match(client, /url\.searchParams\.set\("cursor", cursor\)/);
});

test("native Attic uses encrypted snapshots and dedicated phone/tablet routing", async () => {
  const [hook, app, screens, screen, editor, styles] = await Promise.all([
    read("apps/mobile/src/attic/use-attic.ts"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/attic/AtticScreen.tsx"),
    read("apps/mobile/src/attic/FamilyStoryEditor.tsx"),
    read("apps/mobile/src/attic/attic-editor.css"),
  ]);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.match(hook, /pageCacheKey\(page\)/);
  assert.match(hook, /loadMore/);
  assert.match(hook, /AtticConflictError/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(screens, /@mobile\/attic\/AtticScreen/);
  assert.match(app, /profile\.id === "attic"/);
  assert.match(screen, /useDocuments/);
  assert.match(screen, /useReminders/);
  assert.match(screen, /FamilyStoryEditor/);
  assert.match(screen, /Load older stories/);
  assert.doesNotMatch(screen, /full archive remains available on desktop/i);
  assert.match(editor, /crypto\.randomUUID\(\)/);
  assert.match(editor, /imageDocuments/);
  assert.match(styles, /@media \(min-width:720px\)/);
});

test("web and native Attic use the same section and family-story contract", async () => {
  const [webSections, webStories, mobileManifest] = await Promise.all([
    read("lib/attic-sections.ts"),
    read("lib/family-story-records.ts"),
    read("apps/mobile/package.json"),
  ]);
  assert.match(webSections, /@diarydock\/attic/);
  assert.match(webStories, /@diarydock\/attic/);
  assert.match(mobileManifest, /@diarydock\/attic/);
});
