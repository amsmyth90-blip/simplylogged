import assert from "node:assert/strict";
import test from "node:test";

import { createCoalescedSaver } from "../lib/coalesced-save.ts";

test("coalesced saver writes only the latest rapidly scheduled value", async () => {
  const saved: number[] = [];
  const saver = createCoalescedSaver<number>(async (value) => {
    saved.push(value);
  }, 5);

  saver.schedule(1);
  saver.schedule(2);
  saver.schedule(3);
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepEqual(saved, [3]);
  saver.dispose();
});

test("coalesced saver serialises a newer value behind an in-flight save", async () => {
  const saved: number[] = [];
  let releaseFirst: (() => void) | undefined;
  const firstSave = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const saver = createCoalescedSaver<number>(async (value) => {
    saved.push(value);
    if (value === 1) await firstSave;
  }, 0);

  saver.schedule(1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  saver.schedule(2);
  saver.schedule(3);
  releaseFirst?.();
  await saver.flush();

  assert.deepEqual(saved, [1, 3]);
  saver.dispose();
});
