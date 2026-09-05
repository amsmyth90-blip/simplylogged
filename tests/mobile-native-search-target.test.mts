import assert from "node:assert/strict";
import test from "node:test";

import type { SearchResult } from "../packages/search/src/types.ts";
import { nativeTargetForSearchResult } from "../apps/mobile/src/search/native-search-target.ts";

function result(href: string, category: SearchResult["category"] = "home"): SearchResult {
  return { id: "result", category, title: "Result", detail: "", href };
}

test("search results route to packaged DiaryDock areas", () => {
  assert.deepEqual(nativeTargetForSearchResult(result("/room/kitchen")),
    { kind: "ROOM", roomId: "kitchen" });
  assert.deepEqual(nativeTargetForSearchResult(result("/garage/vehicles/car-1", "vehicles")),
    { kind: "ROOM", roomId: "garage" });
  assert.deepEqual(nativeTargetForSearchResult(result("/driveway/trips/trip-1", "travel")),
    { kind: "ROOM", roomId: "driveway" });
  assert.deepEqual(nativeTargetForSearchResult(result("/office/insurance/policy-1", "insurance")),
    { kind: "ROOM", roomId: "office" });
  assert.deepEqual(nativeTargetForSearchResult(result("/assets/boiler-1", "assets")),
    { kind: "DESTINATION", destination: "PHYSICAL_LINKS" });
  assert.deepEqual(nativeTargetForSearchResult(result("/reminders", "reminders")),
    { kind: "DESTINATION", destination: "REMINDERS" });
});

test("search routing rejects malformed internal paths", () => {
  assert.equal(nativeTargetForSearchResult(result("//evil.example/room/office")), null);
  assert.equal(nativeTargetForSearchResult(result("/room/../office")), null);
  assert.equal(nativeTargetForSearchResult(result("/assets/id?next=evil", "assets")), null);
});
