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

test("native navigation reproduces the wrapper labels and drawn icons", async () => {
  const [navigation, icons, styles] = await Promise.all([
    read("apps/mobile/src/components/MobileBottomNav.tsx"),
    read("apps/mobile/src/components/MobileIcon.tsx"),
    read("apps/mobile/src/components/mobile-navigation.css"),
  ]);
  for (const label of ["Home", "All Files", "Scan", "Reminders", "Family Room"]) {
    assert.ok(navigation.includes(`label: "${label}"`));
  }
  for (const icon of ["home", "folder", "plus", "calendar", "users"]) {
    assert.ok(navigation.includes(`icon: "${icon}"`));
  }
  assert.doesNotMatch(navigation, /[⌂▱＋◷♙]/);
  assert.match(icons, /viewBox="0 0 24 24"/);
  assert.match(styles, /background: #edf4e9/);
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
