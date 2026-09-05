import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { estateAreas, roomProfiles } from "../packages/home/src/index.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web and mobile share one stable estate-map contract", async () => {
  assert.equal(estateAreas.length, 10);
  assert.equal(new Set(estateAreas.map((area) => area.id)).size, estateAreas.length);
  assert.deepEqual(
    estateAreas.filter((area) => ["kitchen", "office", "family-room", "driveway"].includes(area.id))
      .map((area) => area.dashboardLabel),
    ["Documents", "Family", "Home", "Travel"],
  );
  for (const area of estateAreas) {
    assert.match(area.left, /^\d{1,3}%$/);
    assert.match(area.top, /^\d{1,3}%$/);
    assert.match(area.href, /^\//);
  }

  const webEstate = await read("lib/mock-data/estate.ts");
  assert.match(webEstate, /from "@diarydock\/home"/);
});

test("the packaged home preview uses the local estate artwork", async () => {
  const [screen, entry] = await Promise.all([
    read("apps/mobile/src/home/HomeScreen.tsx"),
    read("apps/mobile/src/main.tsx"),
  ]);
  assert.match(screen, /estate-dashboard-country\.webp/);
  assert.match(screen, /estateAreas\.filter/);
  assert.match(screen, /visibleAreaIds/);
  assert.match(screen, /visibleAreas\.map/);
  assert.match(entry, /previewEnabled && preview === "home"/);
});

test("web and packaged clients share room identity and mobile room navigation", async () => {
  const navigableAreaIds = estateAreas
    .filter((area) => area.id !== "front-gate")
    .map((area) => area.id);
  for (const areaId of navigableAreaIds) assert.ok(roomProfiles[areaId], `${areaId} needs a room profile`);
  const [webRooms, homeScreen, mobileApp, navigation] = await Promise.all([
    read("lib/mock-data/rooms.ts"),
    read("apps/mobile/src/home/HomeScreen.tsx"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/components/MobileBottomNav.tsx"),
  ]);
  assert.match(webRooms, /roomProfiles/);
  assert.match(homeScreen, /onOpenArea\(area\.id\)/);
  assert.match(mobileApp, /<RoomScreen/);
  assert.match(navigation, /id: "FAMILY", icon: "users", label: "Family Room"/);
  assert.match(navigation, /onNavigate\(item\.id\)/);
  assert.doesNotMatch(navigation, /disabled><span>♙<\/span>Family/);
});

test("unfinished mobile previews remain gated out of production", async () => {
  const entry = await readFile(new URL("../apps/mobile/src/main.tsx", import.meta.url), "utf8");
  assert.match(entry, /previewEnabled && preview === "files"/);
  assert.match(entry, /import\("@mobile\/preview\/FilesPreview"\)/);
});
