import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  groceryVideoFrameTimes,
  parseGroceryAnalysis,
} from "../packages/kitchen/src/grocery-analysis.ts";

const valid = {
  groceries: [
    { name: "Whole milk", date: "2026-09-25", dateType: "USE_BY", confidence: 0.96 },
    { name: "Pasta", date: null, dateType: null, confidence: 0.82 },
  ],
  summary: "Two groceries found",
};

test("grocery label analysis is exact, bounded and keeps dates paired with their type", () => {
  assert.equal(parseGroceryAnalysis(valid).groceries[0]?.date, "2026-09-25");
  assert.throws(() => parseGroceryAnalysis({ ...valid, privateData: "unexpected" }));
  assert.throws(() => parseGroceryAnalysis({ ...valid, groceries: [
    { name: "Milk", date: "25/09/2026", dateType: "USE_BY", confidence: 0.9 },
  ] }));
  assert.throws(() => parseGroceryAnalysis({ ...valid, groceries: [
    { name: "Milk", date: "2026-09-25", dateType: null, confidence: 0.9 },
  ] }));
});

test("the grocery scan endpoint retains bounded upload, authentication and rate limits", async () => {
  const route = await readFile(new URL(
    "../app/api/mobile/kitchen/groceries/analyse/route.ts", import.meta.url,
  ), "utf8");
  const request = await readFile(new URL(
    "../lib/kitchen/grocery-analysis-request.ts", import.meta.url,
  ), "utf8");
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(request, /readBoundedMultiFile/);
  assert.match(request, /inspectCaptureFile/);
  assert.match(request, /AbortSignal\.timeout\(45_000\)/);
  assert.doesNotMatch(`${route}\n${request}`, /error\.message/);
});

test("the mobile Kitchen exposes a clear grocery-date entry and review-before-save flow", async () => {
  const capture = await readFile(new URL(
    "../apps/mobile/src/kitchen/PantryCaptureStage.tsx", import.meta.url,
  ), "utf8");
  const scanner = await readFile(new URL(
    "../apps/mobile/src/kitchen/GroceryScanner.tsx", import.meta.url,
  ), "utf8");
  const room = await readFile(new URL(
    "../apps/mobile/src/rooms/room-scene-config.ts", import.meta.url,
  ), "utf8");
  const home = await readFile(new URL(
    "../apps/mobile/src/home/HomeScreen.tsx", import.meta.url,
  ), "utf8");
  const source = await readFile(new URL(
    "../apps/mobile/src/capture/capture-source.ts", import.meta.url,
  ), "utf8");
  const client = await readFile(new URL(
    "../apps/mobile/src/kitchen/grocery-analysis-client.ts", import.meta.url,
  ), "utf8");
  assert.match(capture, /Scan groceries &amp; use-by dates/);
  assert.match(room, /Groceries & dates/);
  assert.match(home, /Groceries &amp; dates/);
  assert.match(home, /onNavigate\("KITCHEN"\)/);
  assert.match(scanner, /Check before saving/);
  assert.match(scanner, /Save groceries & reminders/);
  assert.match(scanner, /ReminderService/);
  assert.match(scanner, /Check the original packaging/);
  assert.match(scanner, /Choose several photos/);
  assert.match(scanner, /Record a slow video/);
  assert.match(scanner, /accept="video\/\*"/);
  assert.match(scanner, /capture="environment"/);
  assert.match(source, /allowMultipleSelection: true/);
  assert.match(source, /limit,/);
  assert.match(client, /new Blob/);
  assert.doesNotMatch(client, /new File/);
  assert.doesNotMatch(client, /Accept: "application\/json"/);
});

test("short grocery videos are sampled evenly without exceeding the frame limit", () => {
  assert.deepEqual(groceryVideoFrameTimes(1, 6), [0.5]);
  assert.equal(groceryVideoFrameTimes(30, 6).length, 6);
  assert.deepEqual(groceryVideoFrameTimes(0, 6), []);
  const times = groceryVideoFrameTimes(12, 4);
  assert.equal(times.length, 4);
  assert.ok(times.every((time, index) => index === 0 || time > (times[index - 1] ?? time)));
  assert.ok((times.at(-1) ?? 99) < 12);
});

test("Codemagic developer APKs receive distinct Android build versions", async () => {
  const workflow = await readFile(new URL("../codemagic.yaml", import.meta.url), "utf8");
  assert.match(workflow, /-PversionCode="\$BUILD_NUMBER"/);
  assert.match(workflow, /-PversionName="\$APP_VERSION-dev\.\$BUILD_NUMBER"/);
});
