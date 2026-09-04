import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseHouseholdInviteUrl } from "../apps/mobile/src/family/invite-link.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile household API enforces hybrid auth, bounded input, rate limits, and recent authentication", async () => {
  const route = await read("app/api/mobile/household/route.ts");
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /hasRecentAuthentication/);
  assert.match(route, /Object\.keys\(body\)\.some/);
  assert.match(route, /loadHouseholdDirectory\(supabase, user\.id\)/);
  assert.doesNotMatch(route, /body\.householdId|body\.ownerId|body\.currentUserId/);
});

test("household data is cached only in the encrypted versioned read-model store", async () => {
  const [hook, schema, store] = await Promise.all([
    read("apps/mobile/src/family/use-household.ts"),
    read("apps/mobile/src/data/offline/schema.ts"),
    read("apps/mobile/src/data/offline/sqlite-offline-store.ts"),
  ]);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.match(hook, /HOUSEHOLD_DIRECTORY_SCHEMA_VERSION/);
  assert.match(schema, /cached_read_models/);
  assert.match(store, /openEncryptedOfflineDatabase/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
});

test("mobile Family provides native sharing and preserves Family Room files and reminders", async () => {
  const [screen, records, invites, app] = await Promise.all([
    read("apps/mobile/src/family/FamilyScreen.tsx"),
    read("apps/mobile/src/family/FamilyRecords.tsx"),
    read("apps/mobile/src/family/HouseholdInvites.tsx"),
    read("apps/mobile/src/signed-in-screens.ts"),
  ]);
  assert.match(screen, /HouseholdMembers/);
  assert.match(screen, /HouseholdInvites/);
  assert.match(screen, /HouseholdOwnershipTransfer/);
  assert.match(records, /useDocuments/);
  assert.match(records, /useReminders/);
  assert.match(invites, /Share\.share/);
  assert.match(app, /import\("@mobile\/family\/FamilyScreen"\)/);
});

test("household invite links accept only exact first-party or app URLs", () => {
  const token = "11111111-1111-4111-8111-111111111111";
  const origin = "https://diarydock.com";
  assert.equal(parseHouseholdInviteUrl(`diarydock://family/invite/${token}`, origin), token);
  assert.equal(parseHouseholdInviteUrl(`${origin}/family/invite/${token}`, origin), token);
  assert.equal(parseHouseholdInviteUrl(`https://evil.test/family/invite/${token}`, origin), null);
  assert.equal(parseHouseholdInviteUrl(`diarydock://family/invite/${token}?next=evil`, origin), null);
  assert.equal(parseHouseholdInviteUrl("diarydock://family/invite/not-a-token", origin), null);
});

test("native invitation acceptance is in-memory, authenticated and platform registered", async () => {
  const [hook, screen, client, mobileRoute, web, android, ios] = await Promise.all([
    read("apps/mobile/src/family/use-household-invite-link.ts"),
    read("apps/mobile/src/family/HouseholdInviteScreen.tsx"),
    read("apps/mobile/src/family/household-client.ts"),
    read("app/api/mobile/household/route.ts"),
    read("components/InviteAcceptanceWorkspace.tsx"),
    read("android/app/src/main/AndroidManifest.xml"),
    read("ios/App/App/Info.plist"),
  ]);
  assert.match(hook, /App\.getLaunchUrl/);
  assert.match(hook, /App\.addListener\("appUrlOpen"/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|putReadModel|Filesystem/);
  assert.match(screen, /I understand this joins my account/);
  assert.match(client, /Authorization: authentication\(accessToken\)/);
  assert.match(client, /parseHouseholdInvitePreview/);
  assert.match(mobileRoute, /"accept-invite": new Set\(\["action", "token"\]\)/);
  assert.match(web, /diarydock:\/\/family\/invite/);
  assert.match(android, /android:scheme="diarydock" android:host="family"/);
  assert.match(ios, /<string>diarydock<\/string>/);
});
