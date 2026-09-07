import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { estateAreas, roomProfiles } from "../packages/home/src/index.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every estate area resolves to a packaged mobile workspace", () => {
  for (const area of estateAreas) {
    assert.ok(
      area.id === "front-gate" || area.id === "family-room" || roomProfiles[area.id],
      `${area.id} has no mobile room profile`,
    );
  }
});

test("every specialist room is reachable from the packaged product navigation", async () => {
  const [app, roomRouter, office] = await Promise.all([
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/office/OfficeOverview.tsx"),
  ]);
  const specialistRooms = [
    "attic", "bedroom", "driveway", "garage", "garden", "mailbox", "office", "safe-room",
  ];
  for (const roomId of specialistRooms) {
    assert.match(roomRouter, new RegExp(`profile\\.id === ["']${roomId}["']`));
  }
  assert.match(app, /onOpenSafeRoom=\{\(\) => openRoom\("safe-room"\)\}/);
  assert.match(office, /onClick=\{props\.onOpenSafeRoom\}/);
});

test("every declared mobile destination has a signed-in rendering path", async () => {
  const [app, kitchen, navigation] = await Promise.all([
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/SignedInKitchen.tsx"),
    read("apps/mobile/src/components/MobileBottomNav.tsx"),
  ]);
  const routes = `${app}\n${kitchen}`;
  const declaration = navigation.match(/export type MobileDestination = ([\s\S]*?);/)?.[1] ?? "";
  const destinations = [...declaration.matchAll(/"([A-Z_]+)"/g)].map((match) => match[1]);
  assert.ok(destinations.length >= 15);
  for (const destination of destinations) {
    if (destination === "HOME") continue;
    assert.match(routes, new RegExp(`(?:props\\.)?destination === ["']${destination}["']`));
  }
});

test("native navigation keeps only the three primary destinations", async () => {
  const [navigation, icons, styles] = await Promise.all([
    read("apps/mobile/src/components/MobileBottomNav.tsx"),
    read("apps/mobile/src/components/MobileIcon.tsx"),
    read("apps/mobile/src/components/mobile-navigation.css"),
  ]);
  for (const label of ["Home", "Scan", "All Files"]) {
    assert.ok(navigation.includes(`label: "${label}"`));
  }
  for (const icon of ["home", "plus", "folder"]) {
    assert.ok(navigation.includes(`icon: "${icon}"`));
  }
  assert.doesNotMatch(navigation, /label: "(?:Reminders|Family Room)"/);
  assert.match(styles, /grid-template-columns: repeat\(3,/);
  assert.doesNotMatch(navigation, /[⌂▱＋◷♙]/);
  assert.match(icons, /viewBox="0 0 24 24"/);
  assert.match(styles, /border: 1px solid #c99b3d/);
  assert.match(styles, /linear-gradient\(145deg, #fffdf8, #f7f4ec 62%, #fffdf9\)/);
  assert.match(styles, /radial-gradient\(circle at 35% 25%, #fff4c8/);
  assert.match(styles, /button \+ button::before/);
});

test("native scan entry reproduces the wrapper capture experience", async () => {
  const [nativeCapture, wrapperCapture, wrapperWorkspace, styles] = await Promise.all([
    read("apps/mobile/src/capture/CaptureScreen.tsx"),
    read("components/document-capture/CaptureIdleView.tsx"),
    read("components/DocumentCaptureWorkspace.tsx"),
    read("apps/mobile/src/capture/capture-entry.css"),
  ]);
  for (const label of [
    "Add document",
    "Add every page in reading order",
    "Add one or more pages",
    "Photograph each page or choose several together.",
    "Take photo",
    "Choose pages",
    "You can add up to 12 pages",
  ]) {
    assert.ok(`${wrapperWorkspace}\n${wrapperCapture}`.includes(label), `wrapper capture is missing ${label}`);
    assert.ok(nativeCapture.includes(label), `native capture is missing ${label}`);
  }
  assert.match(nativeCapture, /capture-document-stack\.png/);
  assert.match(nativeCapture, /estate-dashboard-country\.webp/);
  assert.match(styles, /background: rgb\(255 255 255 \/ 68%\)/);
  assert.doesNotMatch(nativeCapture, /Secure capture|Choose photo|Choose file/);
});

test("specialist room labels retain distinct native landing states", async () => {
  const [scenes, router, family] = await Promise.all([
    read("apps/mobile/src/rooms/room-scene-config.ts"),
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/family/FamilyScreen.tsx"),
  ]);
  for (const id of ["profile", "mot-tax", "insurance", "travel-checklist",
    "parking-permits", "medical-records", "emergency", "all", "new"]) {
    assert.match(scenes, new RegExp(`action\\("${id}"`));
  }
  assert.match(router, /DrivewayView/);
  assert.match(router, /initialFilter/);
  assert.match(family, /initialView === "inbox"/);
  assert.match(family, /FamilyInboxScreen/);
});
