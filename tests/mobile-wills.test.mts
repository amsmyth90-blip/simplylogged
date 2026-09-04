import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Wills boundary is owner-scoped, private, bounded and observable", async () => {
  const [route, service, projection] = await Promise.all([
    read("app/api/mobile/wills/route.ts"),
    read("lib/wills/mobile-snapshot-server.ts"),
    read("lib/wills/mobile-payload.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /readBoundedJson\(request, 128 \* 1024\)/);
  assert.match(route, /Cache-Control", "private, no-store/);
  assert.doesNotMatch(route, /ownerId|userId.*body/);
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(service, /apply_mobile_private_state/);
  assert.match(service, /from\("documents"\)/);
  assert.match(service, /\.eq\("user_id", userId\)/);
  assert.match(service, /INVALID_REFERENCE/);
  assert.match(projection, /SNAPSHOT_LIMIT = 480 \* 1024/);
});

test("web and packaged clients share the Wills package boundary", async () => {
  const [willBoundary, letterBoundary, mobileManifest, contract] = await Promise.all([
    read("lib/will-records.ts"), read("lib/letter-records.ts"),
    read("apps/mobile/package.json"), read("packages/wills/src/snapshot.ts"),
  ]);
  assert.match(willBoundary, /@diarydock\/wills/);
  assert.match(letterBoundary, /@diarydock\/wills/);
  assert.match(mobileManifest, /@diarydock\/wills/);
  assert.match(contract, /WILLS_SCHEMA_VERSION/);
  assert.match(contract, /exact\(item/);
});

test("offline Wills projection never contains raw extracted will text", async () => {
  const [projection, types] = await Promise.all([
    read("lib/wills/mobile-projection-will.ts"),
    read("packages/wills/src/analysis.ts"),
  ]);
  assert.doesNotMatch(projection, /extractedText/);
  assert.match(types, /Omit<WillDocumentAnalysis, "extractedText">/);
});

test("native Safe Room uses encrypted snapshots and dedicated specialist routing", async () => {
  const [hook, client, screen, router, screens, app, office] = await Promise.all([
    read("apps/mobile/src/wills/use-wills.ts"),
    read("apps/mobile/src/wills/wills-client.ts"),
    read("apps/mobile/src/wills/SafeRoomScreen.tsx"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/office/OfficeOverview.tsx"),
  ]);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.match(hook, /WillsConflictError/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(screen, /WillsOverview/);
  assert.match(screen, /WillRecords/);
  assert.match(screen, /LettersList/);
  assert.match(screen, /PreparationBoard/);
  assert.match(screen, /WishesPanel/);
  assert.match(screen, /WishesEditor/);
  assert.match(router, /profile\.id === "safe-room"/);
  assert.match(screens, /@mobile\/wills\/SafeRoomScreen/);
  assert.match(app, /onOpenSafeRoom=\{\(\) => openRoom\("safe-room"\)\}/);
  assert.match(office, /Open Safe Room · Wills & wishes/);
});
