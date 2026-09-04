import assert from "node:assert/strict";
import test from "node:test";

import {
  atticItemMatches,
  atticSections,
  belongsInAttic,
  parseAtticMutation,
  parseAtticSnapshot,
  type FamilyStory,
} from "../packages/attic/src/index.ts";
import {
  mutateAtticPayload,
  projectAtticSnapshot,
} from "../lib/attic/mobile-payload.ts";

const revision = "2026-09-02T09:00:00.000Z";

function story(overrides: Partial<FamilyStory> = {}): FamilyStory {
  return {
    id: "story-1",
    title: "A family day",
    storyText: "A story with enough detail to preserve for the family.",
    people: "Amy and family",
    place: "Home",
    dateLabel: "Summer 2026",
    tags: ["family"],
    images: [{ documentId: "document-1", fileName: "family-photo.jpg" }],
    createdAt: revision,
    updatedAt: revision,
    ...overrides,
  };
}

test("Attic sections and classification preserve the specialist boundaries", () => {
  assert.deepEqual(atticSections.map((item) => item.id), [
    "photo-albums",
    "keepsakes",
    "family-history",
    "letters-journals",
    "memory-box",
  ]);
  assert.equal(belongsInAttic({ roomName: "ATTIC" }), true);
  assert.equal(
    atticItemMatches(
      { roomId: "attic", kind: "Image", title: "Unlabelled scan" },
      "photo-albums",
    ),
    true,
  );
  assert.equal(
    atticItemMatches(
      { roomId: "attic", title: "Letter from Grandad" },
      "letters-journals",
    ),
    true,
  );
  assert.equal(
    atticItemMatches({ roomId: "safe-room", title: "Family will" }, "family-history"),
    false,
  );
});

test("Attic projection exposes only bounded family-story data deterministically", () => {
  const payload = {
    bankAccount: "must-not-leave-server",
    familyStories: [story(), { title: "Missing stable ID" }],
  };
  const snapshot = projectAtticSnapshot(payload, revision);
  assert.equal(snapshot.stories.length, 1);
  assert.equal(snapshot.totalStoryCount, 1);
  assert.equal(snapshot.cursor, null);
  assert.equal(snapshot.nextCursor, null);
  assert.equal("bankAccount" in snapshot, false);
  assert.deepEqual(snapshot, projectAtticSnapshot(payload, revision));
  assert.doesNotThrow(() => parseAtticSnapshot(snapshot));
});

test("Attic projection fits safely inside the encrypted read-model capacity", () => {
  const familyStories = Array.from({ length: 1_000 }, (_, index) =>
    story({
      id: `story-${index}`,
      title: `Story ${index}`,
      storyText: "x".repeat(20_000),
    }),
  );
  const snapshot = projectAtticSnapshot({ familyStories }, revision);
  assert.equal(snapshot.totalStoryCount, 1_000);
  assert.ok(snapshot.stories.length > 0);
  assert.ok(snapshot.stories.length < 1_000);
  assert.equal(snapshot.cursor, null);
  assert.ok(snapshot.nextCursor);
  assert.ok(JSON.stringify(snapshot).length <= 480 * 1024);

  const next = projectAtticSnapshot(
    { familyStories },
    revision,
    snapshot.nextCursor,
  );
  assert.equal(next.cursor, snapshot.nextCursor);
  assert.notEqual(next.stories[0]?.id, snapshot.stories[0]?.id);
  assert.ok(JSON.stringify(next).length <= 480 * 1024);

  const projectedIds = new Set<string>();
  let cursor: string | null = null;
  let pages = 0;
  do {
    const page = projectAtticSnapshot({ familyStories }, revision, cursor);
    page.stories.forEach((item) => {
      assert.equal(projectedIds.has(item.id), false);
      projectedIds.add(item.id);
    });
    cursor = page.nextCursor;
    pages += 1;
    assert.ok(pages < 1_000);
  } while (cursor);
  assert.equal(projectedIds.size, familyStories.length);
});

test("Attic mutations are idempotent and preserve unrelated desktop state", () => {
  const source = { privateEstateData: { untouched: true }, familyStories: [] };
  const mutation = parseAtticMutation({
    operation: "ADD_STORY",
    revision,
    story: story(),
  });
  const result = mutateAtticPayload(source, mutation);
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.privateEstateData, source.privateEstateData);
  assert.equal((result.payload.familyStories as FamilyStory[])[0]?.id, "story-1");
  assert.equal(source.familyStories.length, 0);
  assert.equal(mutateAtticPayload(result.payload, mutation).status, "IDEMPOTENT");
  assert.equal(
    mutateAtticPayload(result.payload, {
      ...mutation,
      story: story({ title: "Different story" }),
    }).status,
    "DUPLICATE",
  );
});

test("Attic contracts reject owner fields, oversized text and unknown output", () => {
  assert.throws(
    () => parseAtticMutation({
      operation: "ADD_STORY",
      revision,
      story: story(),
      ownerId: "another-user",
    }),
    /unsupported fields/,
  );
  assert.throws(
    () => parseAtticMutation({
      operation: "ADD_STORY",
      revision,
      story: story({ storyText: "x".repeat(20_001) }),
    }),
    /Story is invalid/,
  );
  assert.throws(
    () => parseAtticSnapshot({
      schemaVersion: 2,
      revision,
      totalStoryCount: 0,
      cursor: null,
      nextCursor: null,
      stories: [],
      secret: true,
    }),
    /unsupported fields/,
  );
});
