import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Garage is owner-scoped, bounded, revision-safe and observable", async () => {
  const [route, service, client] = await Promise.all([
    read("app/api/mobile/garage/route.ts"),
    read("lib/garage/mobile-snapshot-server.ts"),
    read("apps/mobile/src/garage/garage-client.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(service, /\.eq\("updated_at", current\.data\.updated_at\)/);
  assert.match(service, /status: "CONFLICT"/);
  assert.match(service, /mutation\.operation === "ADD_VEHICLE"/);
  assert.match(service, /snapshot\.vehicles\.some/);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(client, /getSecureRuntime\(\)\.apiOrigin/);
});

test("native Garage uses encrypted snapshots and specialist phone/tablet routing", async () => {
  const [hook, app, screens, screen, editor, styles, schema] = await Promise.all([
    read("apps/mobile/src/garage/use-garage.ts"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/garage/GarageScreen.tsx"),
    read("apps/mobile/src/garage/GarageVehicleEditor.tsx"),
    read("apps/mobile/src/garage/garage-editor.css"),
    read("apps/mobile/src/data/offline/schema.ts"),
  ]);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.match(hook, /GarageConflictError/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  assert.match(screens, /@mobile\/garage\/GarageScreen/);
  assert.match(app, /profile\.id === "garage"/);
  assert.match(screen, /GarageOverview/);
  assert.match(screen, /GarageQuickAdd/);
  assert.match(screen, /GarageVehicleEditor/);
  assert.doesNotMatch(screen, /Add the first vehicle from DiaryDock on desktop/);
  assert.match(editor, /operation: "ADD_VEHICLE"/);
  assert.match(editor, /crypto\.randomUUID\(\)/);
  assert.match(editor, /disabled=\{props\.busy \|\| !props\.online\}/);
  assert.match(screen, /GarageRecords/);
  assert.match(styles, /@media \(min-width: 720px\)/);
  assert.match(schema, /OFFLINE_DATABASE_VERSION = 8/);
  assert.match(schema, /length\(payload_json\) <= 524288/);
});
