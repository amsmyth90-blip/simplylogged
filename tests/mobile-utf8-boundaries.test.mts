import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { projectAtticSnapshot } from "../lib/attic/mobile-payload.ts";
import { projectGarageSnapshot } from "../lib/garage/mobile-payload.ts";
import { projectHealthSnapshot } from "../lib/health/mobile-payload.ts";
import { parseEmergencyAccessDirectory } from "../packages/emergency-access/src/parser.ts";

const SNAPSHOT_BYTES = 480 * 1024;

function bytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

test("mobile snapshot fitters measure multibyte Attic, Garage and Health data", () => {
  const attic = projectAtticSnapshot({
    familyStories: Array.from({ length: 1_000 }, (_, index) => ({
      id: `story-${index}`,
      title: `Family story ${index}`,
      storyText: "🔥".repeat(10_000),
    })),
  }, "1");
  const garage = projectGarageSnapshot({
    vehicles: {
      vehicles: [{
        id: "vehicle-1",
        nickname: "Family car",
        notes: Array.from({ length: 200 }, (_, index) => ({
          id: `note-${index}`,
          title: `Note ${index}`,
          content: "車".repeat(4_000),
        })),
      }],
    },
  }, "1");
  const health = projectHealthSnapshot({
    health: {
      conditions: Array.from({ length: 1_000 }, (_, index) => ({
        id: `condition-${index}`,
        name: `Condition ${index}`,
        notes: "🩺".repeat(2_000),
      })),
    },
  }, "1");

  assert.ok(bytes(attic) <= SNAPSHOT_BYTES);
  assert.ok(bytes(garage) <= SNAPSHOT_BYTES);
  assert.ok(bytes(health) <= SNAPSHOT_BYTES);
});

test("trusted-access snapshots apply their aggregate limit to UTF-8 bytes", () => {
  const directory = {
    schemaVersion: 1,
    contacts: [],
    resources: [],
    notifications: [],
    received: [{
      id: "95a4c45f-e05d-43d0-8320-43223b5dfe8f",
      resourceType: "INSTRUCTION",
      label: "Emergency instructions",
      snapshot: {
        title: "Emergency instructions",
        summary: "Important",
        steps: Array.from({ length: 20 }, () => "🔥".repeat(200)),
      },
      grantedAt: "2026-09-01T14:00:00.000Z",
      contactName: "Trusted contact",
      contactRelation: "Family",
    }],
  };
  assert.ok(JSON.stringify(directory.received[0]!.snapshot).length < 12_000);
  assert.throws(() => parseEmergencyAccessDirectory(directory), /snapshot is invalid/);
});

test("the mobile sync request ceiling measures transmitted UTF-8 bytes", async () => {
  const source = await readFile(
    new URL("../apps/mobile/src/sync/http-sync-client.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /new TextEncoder\(\)\.encode\(body\)\.byteLength/);
  assert.doesNotMatch(source, /body\.length > 512 \* 1024/);
});
