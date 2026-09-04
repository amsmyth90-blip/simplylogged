import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("desktop Garage routes through real account vehicles instead of a placeholder", async () => {
  const [workspace, chooser] = await Promise.all([
    read("components/GarageWorkspace.tsx"),
    read("components/garage/VehicleProfileTop.tsx"),
  ]);

  assert.match(workspace, /useDiaryDockData\(\)/);
  assert.match(workspace, /state\.vehicles\.vehicles\[0\]\?\.id/);
  assert.match(workspace, /\/garage\/vehicles\/new/);
  assert.match(workspace, /Add your first vehicle/);
  assert.doesNotMatch(workspace, /DEFAULT_VEHICLE_ID|tesla-model-y/);
  assert.match(chooser, /MAX_GARAGE_VEHICLES/);
  assert.match(chooser, /href="\/garage\/vehicles\/new"/);
});

test("desktop vehicle creation is authenticated, bounded and uses the shared record factory", async () => {
  const [page, creator, mutation] = await Promise.all([
    read("app/garage/vehicles/new/page.tsx"),
    read("components/garage/NewVehicleWorkspace.tsx"),
    read("lib/garage/mobile-mutation.ts"),
  ]);

  assert.match(page, /await requireUser\(\)/);
  assert.match(creator, /parseGarageMutation/);
  assert.match(creator, /crypto\.randomUUID\(\)/);
  assert.match(creator, /MAX_GARAGE_VEHICLES/);
  assert.match(creator, /createVehicleRecord\(mutation\)/);
  assert.match(creator, /updateState\(\(current\)/);
  assert.match(creator, /FIRST_VEHICLE_ADDED/);
  assert.match(mutation, /createVehicleRecord\(mutation, now, createId\)/);
});
