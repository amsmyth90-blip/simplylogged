import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseEmergencyMutation } from "../packages/emergency/src/index.ts";
import {
  mutateEmergencyPayload,
  projectEmergencySnapshot,
} from "../lib/emergency/payload.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const revision = "2026-09-02T09:00:00.000Z";

test("Emergency writes preserve unrelated legacy app state", () => {
  const source = {
    settingsProfile: { name: "Amy", private: "unchanged" },
    emergencyContacts: [],
    careContacts: [],
    emergencyPlans: [{ id: "existing", title: "Fire", summary: "Leave", steps: ["Outside"] }],
  };
  const mutation = parseEmergencyMutation({
    operation: "ADD_CONTACT",
    revision,
    name: "Jane Smith",
    relation: "Neighbour",
    phone: "07700 900123",
    note: "Spare key",
  });
  const next = mutateEmergencyPayload(source, mutation, () => "fixed-id");
  assert.deepEqual(next.settingsProfile, source.settingsProfile);
  assert.deepEqual(next.emergencyPlans, source.emergencyPlans);
  assert.equal((next.emergencyContacts as Array<{ id: string }>)[0]?.id, "ec-fixed-id");
  assert.equal((next.careContacts as Array<{ initials: string }>)[0]?.initials, "JS");
  assert.equal(source.emergencyContacts.length, 0);
});

test("Emergency projection drops malformed legacy entries and exposes only its contract", () => {
  const snapshot = projectEmergencySnapshot({
    secretAccountNumber: "not-for-mobile",
    emergencyContacts: [
      { id: "valid", name: "Jane", relation: "Neighbour", phone: "1" },
      { id: "invalid", name: "" },
    ],
    careContacts: [],
    emergencyPlans: [],
    homeInfo: [],
  }, revision);
  assert.equal(snapshot.contacts.length, 1);
  assert.equal("secretAccountNumber" in snapshot, false);
});

test("mobile Emergency boundary is owner-scoped, bounded, observed and revision-safe", async () => {
  const [route, service, hook, app] = await Promise.all([
    read("app/api/mobile/emergency/route.ts"),
    read("lib/emergency/snapshot-server.ts"),
    read("apps/mobile/src/emergency/use-emergency.ts"),
    read("apps/mobile/src/signed-in-screens.ts"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(service, /\.eq\("id", userId\)/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(service, /apply_mobile_private_state/);
  assert.match(service, /status: "CONFLICT"/);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  assert.match(app, /import\("@mobile\/emergency\/EmergencyScreen"\)/);
});
