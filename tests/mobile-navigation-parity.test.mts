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
  const [app, navigation] = await Promise.all([
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/components/MobileBottomNav.tsx"),
  ]);
  const declaration = navigation.match(/export type MobileDestination = ([\s\S]*?);/)?.[1] ?? "";
  const destinations = [...declaration.matchAll(/"([A-Z_]+)"/g)].map((match) => match[1]);
  assert.ok(destinations.length >= 15);
  for (const destination of destinations) {
    if (destination === "HOME") continue;
    assert.match(app, new RegExp(`destination === ["']${destination}["']`));
  }
});
