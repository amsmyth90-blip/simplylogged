import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile search and Ask enforce auth, rate limits, bounded input and safe telemetry", async () => {
  const [search, ask] = await Promise.all([
    read("app/api/mobile/search/route.ts"),
    read("app/api/mobile/ask/route.ts"),
  ]);
  assert.match(search, /authenticateHybridRequest/);
  assert.match(search, /checkServerRateLimit/);
  assert.match(search, /loadAuthorizedSearchCandidates/);
  assert.match(search, /RequestObservation/);
  assert.doesNotMatch(search, /emitServerEvent\([^)]*query/s);
  assert.match(ask, /readBoundedJson\(request, 4 \* 1024\)/);
  assert.match(ask, /Object\.keys\(body\)\.some/);
  assert.match(ask, /answerAuthorizedQuestion\(authorized\.candidates, question\)/);
  assert.doesNotMatch(ask, /console\.(log|info|warn|error)/);
});

test("mobile search uses encrypted local records and never browser storage", async () => {
  const [local, recent, screen, app] = await Promise.all([
    read("apps/mobile/src/search/local-candidates.ts"),
    read("apps/mobile/src/search/recent-searches.ts"),
    read("apps/mobile/src/search/SearchScreen.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
  ]);
  assert.match(local, /DocumentService/);
  assert.match(local, /ReminderService/);
  assert.match(recent, /tryGetReadModel\(store/);
  assert.match(recent, /tryPutReadModel\(store/);
  assert.doesNotMatch(recent, /localStorage|sessionStorage/);
  assert.match(screen, /DocumentViewer/);
  assert.match(app, /import\("@mobile\/search\/SearchScreen"\)/);
});

test("mobile Ask is a dedicated conversation surface without changing primary navigation", async () => {
  const [panel, home, app, navigation] = await Promise.all([
    read("apps/mobile/src/search/AskPanel.tsx"),
    read("apps/mobile/src/home/HomeScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/components/MobileBottomNav.tsx"),
  ]);
  assert.match(home, /Ask DiaryDock/);
  assert.match(home, /props\.onAsk/);
  assert.match(app, /destination === "ASK" \|\| destination === "SEARCH"/);
  assert.match(app, /initialMode=\{destination === "ASK" \? "ASK" : "SEARCH"\}/);
  assert.match(panel, /ask-thread/);
  assert.match(panel, /turns\.map/);
  assert.match(panel, /New chat/);
  assert.doesNotMatch(navigation, /label: "Ask/);
});
