import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("native rooms use the same full-scene artwork and labels as the web rooms", async () => {
  const config = await read("apps/mobile/src/rooms/room-scene-config.ts");
  const expectedImages = [
    "attic-memory-room-v1.webp",
    "bedroom-health-room-clean.webp",
    "office-interactive-v1.webp",
    "family-fireside-clean.webp",
    "kitchen-coastal-cottage.webp",
    "garage-folio-hero-v5.webp",
    "garden-command-centre-v2.webp",
    "08-car-boot-departure.webp",
    "mailbox-hero.webp",
    "safe-room-hero.webp",
  ];
  const expectedLabels = [
    "Photo Albums",
    "Health Documents",
    "Admin inbox",
    "Today’s admin",
    "Family inbox",
    "Meal planner",
    "Vehicle Profile",
    "Garden Jobs",
    "Travel Checklist",
    "Incoming items",
    "My Will",
  ];

  for (const image of expectedImages) assert.match(config, new RegExp(image));
  for (const label of expectedLabels) assert.ok(config.includes(`"${label}"`));
});

test("native room scenes fill the viewport and render accessible image labels", async () => {
  const [screen, styles] = await Promise.all([
    read("apps/mobile/src/rooms/RoomSceneScreen.tsx"),
    read("apps/mobile/src/rooms/rooms.css"),
  ]);

  assert.match(screen, /className="native-room-scene"/);
  assert.match(screen, /className="native-room-image"/);
  assert.match(screen, /scene\.actions\.map/);
  assert.match(screen, /aria-label={`Open \${item\.label}: \${item\.description}`}/);
  assert.match(styles, /\.native-room-scene\s*{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
  assert.match(styles, /\.native-room-image\s*{[\s\S]*?width: 100%;[\s\S]*?height: 100%;/);
  assert.match(styles, /\.native-room-label\s*{[\s\S]*?position: absolute;/);
  assert.match(styles, /background: rgb\(229 236 222 \/ 94%\)/);
  assert.match(styles, /color: #284334/);
});

test("room artwork and edge labels remain visible on narrow screens", async () => {
  const [screen, styles, config] = await Promise.all([
    read("apps/mobile/src/rooms/RoomSceneScreen.tsx"),
    read("apps/mobile/src/rooms/rooms.css"),
    read("apps/mobile/src/rooms/room-scene-config.ts"),
  ]);
  const positions = [...config.matchAll(
    /action\([^\n]+?,\s*"([\d.]+)%",\s*"([\d.]+)%"\)/g,
  )];

  assert.match(styles, /width: min\(100vw, 56\.27dvh\)/);
  assert.match(styles, /height: min\(100dvh, 177\.71vw\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /\.native-room-label\[data-edge="left"\]/);
  assert.match(styles, /\.native-room-label\[data-edge="right"\]/);
  assert.match(screen, /data-edge={labelEdge\(item\.left\)}/);
  assert.ok(positions.length >= 40, "expected every configured room action");
  for (const [, left, top] of positions) {
    assert.ok(Number(left) >= 15 && Number(left) <= 85, `unsafe horizontal position ${left}`);
    assert.ok(Number(top) >= 15 && Number(top) <= 85, `unsafe vertical position ${top}`);
  }
});

test("room labels open the matching secure native workspace", async () => {
  const [router, app, navigation, preview, scenes] = await Promise.all([
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/room-navigation.ts"),
    read("apps/mobile/src/preview/RoomPreview.tsx"),
    read("apps/mobile/src/rooms/room-scene-config.ts"),
  ]);

  assert.match(router, /if \(!activeAction\)[\s\S]*?<RoomSceneScreen/);
  assert.match(router, /initialSection={activeAction as AtticSectionId}/);
  assert.match(router, /initialTab={activeAction as GarageTab}/);
  assert.match(scenes, /action\("profile", "Vehicle Profile"/);
  assert.match(scenes, /action\("mot-tax", "MOT & Tax"/);
  assert.match(scenes, /action\("insurance", "Insurance"/);
  assert.match(router, /"medical-records": "documents"/);
  assert.match(router, /emergency: "emergency"/);
  assert.match(scenes, /action\("all", "Incoming items"/);
  assert.match(scenes, /action\("new", "Needs filing"/);
  assert.match(router, /initialFilter={initialFilter}/);
  assert.match(scenes, /action\("travel-checklist", "Travel Checklist"/);
  assert.match(scenes, /action\("parking-permits", "Parking & Permits"/);
  assert.match(router, /initialView={activeAction as DrivewayView}/);
  assert.match(router, /initialView={activeAction as WillsView}/);
  assert.match(router, /initialView={activeAction as "household" \| "inbox" \| "schedules"}/);
  assert.match(navigation, /calendar: "KITCHEN_CALENDAR"/);
  assert.match(navigation, /noticeboard: "KITCHEN_NOTICES"/);
  assert.match(navigation, /recipes: "KITCHEN_RECIPES"/);
  assert.match(app, /kitchenDestinationFor\(actionId\)/);
  assert.match(app, /setRoomId\("family-room"\)/);
  assert.match(preview, /<RoomSceneScreen/);
});
