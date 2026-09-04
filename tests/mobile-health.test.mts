import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createHealthMutation } from "../apps/mobile/src/health/health-record-mutation.ts";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Health read boundary is owner-scoped, private, bounded and observable", async () => {
  const [route, service, projection] = await Promise.all([
    read("app/api/mobile/health/route.ts"),
    read("lib/health/mobile-snapshot-server.ts"),
    read("lib/health/mobile-payload.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /readBoundedJson\(request, 32 \* 1024\)/);
  assert.match(route, /Cache-Control", "private, no-store/);
  assert.doesNotMatch(route, /ownerId|userId.*body/);
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(service, /select\("payload,updated_at"\)/);
  assert.match(service, /\.eq\("updated_at", current\.data\.updated_at\)/);
  assert.match(service, /status: "CONFLICT"/);
  assert.match(projection, /SNAPSHOT_LIMIT = 480 \* 1024/);
  assert.match(projection, /projectHealthSnapshot/);
  assert.doesNotMatch(projection, /bankAccount|vaultDocuments|email|address|contactNotes|meetings/);
  assert.match(projection, /projectHealthDirectory/);
});

test("web and packaged clients share the versioned Health contract", async () => {
  const [webBoundary, mobileManifest, contract] = await Promise.all([
    read("lib/health-records.ts"),
    read("apps/mobile/package.json"),
    read("packages/health/src/snapshot.ts"),
  ]);
  assert.match(webBoundary, /@diarydock\/health/);
  assert.match(mobileManifest, /@diarydock\/health/);
  assert.match(contract, /HEALTH_SCHEMA_VERSION/);
  assert.match(contract, /exact\(item/);
});

test("native Health uses encrypted snapshots and dedicated specialist routing", async () => {
  const [hook, client, screen, router, screens, editor, connections] = await Promise.all([
    read("apps/mobile/src/health/use-health.ts"),
    read("apps/mobile/src/health/health-client.ts"),
    read("apps/mobile/src/health/HealthScreen.tsx"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/health/HealthRecordEditor.tsx"),
    read("apps/mobile/src/health/HealthConnections.tsx"),
  ]);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.match(hook, /HealthConflictError/);
  assert.match(hook, /mutateMobileHealth/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(screen, /HealthOverview/);
  assert.match(screen, /HealthRecordList/);
  assert.match(screen, /HealthRecordEditor/);
  assert.match(screen, /HealthFamilyEditor/);
  assert.match(screen, /createWithId/);
  assert.match(screen, /useDocuments/);
  assert.match(router, /profile\.id === "bedroom"/);
  assert.match(screens, /@mobile\/health\/HealthScreen/);
  assert.match(editor, /Create a reminder after saving this appointment/);
  assert.match(connections, /Linked contacts/);
});

test("health editor mutations preserve the typed record and timeline contract", () => {
  const draft = {
    title: " Annual review ",
    secondary: " Practice nurse ",
    detail: " Clinic ",
    date: "2026-09-14",
    time: "10:30",
    notes: " Bring medication list ",
  };
  const result = createHealthMutation(
    "appointment",
    draft,
    "8a572881-c83a-4ba6-8cbf-465f7ccda345",
  );

  assert.equal(result.operation, "ADD_APPOINTMENT");
  if (result.operation !== "ADD_APPOINTMENT") return;
  assert.equal(result.record.title, "Annual review");
  assert.equal(result.record.provider, "Practice nurse");
  assert.equal(result.record.location, "Clinic");
  assert.equal(result.record.preparationNotes, "Bring medication list");
  assert.equal(result.record.reminderId, "8a572881-c83a-4ba6-8cbf-465f7ccda345");
  assert.equal(result.timeline.type, "appointment");
  assert.equal(result.timeline.linkedRecordId, result.record.id);
});
