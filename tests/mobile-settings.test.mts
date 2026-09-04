import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile settings use the authenticated bounded API without exposing ownership controls", async () => {
  const [route, client] = await Promise.all([
    read("app/api/mobile/settings/route.ts"),
    read("apps/mobile/src/settings/settings-client.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest\(request\)/);
  assert.match(route, /readBoundedJson\(request, 4 \* 1024\)/);
  assert.match(route, /mobileCorsHeaders\(request\)/);
  assert.match(route, /input_user_id: user\.id/);
  assert.match(route, /hasRecentAuthentication\(user\.last_sign_in_at\)/);
  assert.doesNotMatch(route, /body\.userId|body\.ownerId/);
  assert.match(client, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(client, /readBoundedJsonResponse/);
});

test("the packaged Front Gate exposes security and account controls without loading a remote UI", async () => {
  const [home, app, screens, settings, mobilePackage] = await Promise.all([
    read("apps/mobile/src/home/HomeScreen.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
    read("apps/mobile/src/settings/SettingsScreen.tsx"),
    read("apps/mobile/package.json"),
  ]);
  assert.doesNotMatch(home, /area\.id === "front-gate"/);
  assert.match(app, /roomId === "front-gate"/);
  assert.match(app, /<SettingsScreen/);
  assert.match(screens, /SettingsScreen = lazy\(\(\) =>\s+import\("@mobile\/settings\/SettingsScreen"\)/);
  assert.doesNotMatch(app, /import \{ SettingsScreen \} from "@mobile\/settings/);
  assert.match(settings, /Encrypted local database/);
  assert.match(settings, /REQUEST_DELETION|requestMobileAccountDeletion/);
  assert.match(settings, /Browser\.open/);
  assert.doesNotMatch(settings, /window\.location|iframe/);
  assert.match(mobilePackage, /@capacitor\/browser/);
});
