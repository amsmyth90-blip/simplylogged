import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { settingsProfileForDisplay } from "../components/settings/settings-model.ts";

test("settings profile fills authenticated account details without overwriting saved values", () => {
  const blank = { name: "", email: "", plan: "DiaryDock", memberSince: "", initials: "" };
  assert.deepEqual(settingsProfileForDisplay(blank, {
    email: "owner@example.test",
    createdAt: "2026-09-21T12:00:00.000Z",
  }), {
    name: "Your DiaryDock",
    email: "owner@example.test",
    plan: "DiaryDock",
    memberSince: "September 2026",
    initials: "YD",
  });

  const saved = { ...blank, name: "Amy Smyth", email: "saved@example.test", memberSince: "July 2026" };
  assert.equal(settingsProfileForDisplay(saved, {
    email: "auth@example.test",
    createdAt: "2026-09-21T12:00:00.000Z",
  }).email, "saved@example.test");
});

test("calendar, sign-out, bootstrap, and staging cleanup retain the visual QA fixes", async () => {
  const [calendar, calendarModel, signOutPanel, signOutRoute, bootstrap, cleanup, migration] = await Promise.all([
    readFile(new URL("../components/kitchen-feature/FamilyCalendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/kitchen-feature/kitchen-feature-model.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/SignOutPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/signout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-bootstrap-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../tools/load/staging-users.mjs", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260921170000_concurrent_household_bootstrap.sql", import.meta.url), "utf8"),
  ]);

  assert.match(calendar, /Nothing planned/);
  assert.doesNotMatch(calendarModel, /Dentist|Eye test|Movie night|Call Grandma/);
  assert.match(signOutPanel, /action="\/api\/auth\/signout" method="post"/);
  assert.match(signOutRoute, /isSameOriginRequest/);
  assert.match(signOutRoute, /NextResponse\.redirect\(new URL\("\/login"/);
  assert.match(bootstrap, /attempt < 2/);
  assert.match(bootstrap, /response\.status === 503/);
  assert.match(cleanup, /prepare_account_deletion/);
  assert.match(cleanup, /result\.status === "rejected" \|\| result\.value/);
  assert.match(migration, /pg_advisory_xact_lock/);
});
