import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the signed-in mobile tree is keyed to the authenticated account", async () => {
  const source = await readFile("apps/mobile/src/MobileApp.tsx", "utf8");

  assert.match(source, /<SignedInApp key=\{state\.session\.user\.id\}/);
});
