import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web and native Garden share one specialist section contract", async () => {
  const [webBoundary, webModel, screen, packageManifest] = await Promise.all([
    read("lib/garden-sections.ts"),
    read("components/garden/garden-section-model.ts"),
    read("apps/mobile/src/garden/GardenScreen.tsx"),
    read("apps/mobile/package.json"),
  ]);
  assert.match(webBoundary, /@diarydock\/garden/);
  assert.match(webModel, /gardenDocumentMatches/);
  assert.match(webModel, /gardenReminderMatches/);
  assert.match(screen, /from "@diarydock\/garden"/);
  assert.match(packageManifest, /@diarydock\/garden/);
});

test("native Garden retains encrypted offline files and full reminder mutation", async () => {
  const [screen, records, editor, screens, router] = await Promise.all([
    read("apps/mobile/src/garden/GardenScreen.tsx"),
    read("apps/mobile/src/garden/GardenRecords.tsx"),
    read("apps/mobile/src/reminders/ReminderEditor.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/SignedInRoom.tsx"),
  ]);
  assert.match(screen, /useDocuments/);
  assert.match(screen, /useReminders/);
  assert.match(screen, /reminders\.create/);
  assert.match(screen, /reminders\.toggle/);
  assert.match(screen, /DocumentViewer/);
  assert.doesNotMatch(screen, /localStorage|sessionStorage|indexedDB/i);
  assert.match(records, /onAddReminder/);
  assert.match(editor, /defaults\?: Partial<EditableReminder>/);
  assert.match(screens, /@mobile\/garden\/GardenScreen/);
  assert.match(router, /profile\.id === "garden"/);
});
