import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  WILLS_SCHEMA_VERSION,
  createInitialWillRecord,
  createInitialWishesPreferences,
  parseLetterDraft,
  parseWishesPreferencesDraft,
  parseWillsMutation,
  parseWillsSnapshot,
  type LetterOfWishes,
  type WillDocumentAnalysis,
} from "../packages/wills/src/index.ts";
import {
  mutateWillsPayload,
  projectWillsSnapshot,
} from "../lib/wills/mobile-payload.ts";
import {
  requiredWillsDocumentIds,
  validWillsDocumentRows,
} from "../lib/wills/document-references.ts";
import {
  applyWishesPreferences,
  wishesDraftFromRecord,
} from "../components/wills/preferences/wishes-preferences-model.ts";

const now = "2026-09-02T12:00:00.000Z";

function analysis(): WillDocumentAnalysis {
  return {
    overview: "User-reviewable summary",
    executors: ["Alex Morgan"], beneficiaries: ["Family"], guardians: [],
    specificGifts: [], charitableGifts: [], residueOfEstate: ["Family"],
    funeralWishesReferences: [], conditionsOrInstructions: [],
    questionsOrUnclearWording: ["Ask a solicitor"],
    extractedText: "raw legal document text must not enter the offline projection",
    confidence: 0.82,
  };
}

function source() {
  const will = createInitialWillRecord();
  will.versions = [{
    id: "will-version-1", documentId: "document-1", versionLabel: "Signed will",
    uploadedAt: now, signedDate: "2026-08-20", status: "signed", isCurrent: true,
    currentConfirmed: true, notes: "Checked by the user", analysisStatus: "ready",
    summaryReview: "unreviewed", summaryReviewNote: "", detectedSummary: analysis(),
  }];
  will.currentVersionId = "will-version-1";
  will.primaryExecutor = { name: "Alex Morgan", email: "alex@example.com", phone: "01234", informed: true };
  will.preparation.executors = { status: "complete", confirmedData: "Alex has agreed", updatedAt: now };
  will.updatedAt = now;
  const letter: LetterOfWishes = {
    id: "letter-1", title: "For my family", recipientType: "family", recipientName: "",
    purpose: "important-guidance", content: "A private message.", envelopeTitle: "For my family",
    envelopeMessage: "With love", memoryNotes: "", attachmentDocumentIds: [],
    delivery: { type: "not-set", date: "", time: "", eventDescription: "", reminder: "none", intendedPeople: "", trustedSettingsReviewed: false },
    deliveryActivation: "not-active", status: "draft",
    versions: [{ id: "letter-version-1", versionNumber: 1, createdAt: now, title: "For my family", content: "A private message.", envelopeTitle: "For my family", envelopeMessage: "With love" }],
    createdAt: now, updatedAt: now,
  };
  return {
    willsWishes: {
      ...createInitialWishesPreferences(),
      fullName: "Taylor Morgan",
      funeralPreference: "A small family gathering",
      personalMessage: "Remember the ordinary days.",
      updatedAt: now,
      myWill: will,
      lettersOfWishes: { letters: [letter], updatedAt: now },
    },
  };
}

test("Wills projection is strict, versioned and excludes raw extracted legal text", () => {
  const projected = projectWillsSnapshot({ ...source(), bankAccount: "never" }, now);
  assert.equal(projected.schemaVersion, WILLS_SCHEMA_VERSION);
  assert.equal(projected.will.versions[0]?.detectedSummary?.overview, "User-reviewable summary");
  assert.equal("extractedText" in (projected.will.versions[0]?.detectedSummary ?? {}), false);
  assert.equal(JSON.stringify(projected).includes("bankAccount"), false);
  assert.equal(projected.wishes.funeralPreference, "A small family gathering");
  assert.doesNotThrow(() => parseWillsSnapshot(projected));
});

test("Wishes updates are strict, idempotent and preserve the legal sub-records", () => {
  const initial = source();
  const preferences = {
    ...createInitialWishesPreferences(),
    fullName: "Taylor Morgan",
    funeralPreference: "A private woodland service",
    lastReviewed: "2026-09-02",
  };
  const draft = parseWishesPreferencesDraft(preferences);
  const mutation = parseWillsMutation({
    operation: "UPDATE_WISHES",
    revision: now,
    preferences: draft,
  });
  const saved = mutateWillsPayload(initial, mutation);
  assert.equal(saved.status, "OK");
  if (saved.status !== "OK") return;
  const willsWishes = saved.payload.willsWishes as Record<string, unknown>;
  assert.equal(willsWishes.funeralPreference, "A private woodland service");
  assert.deepEqual(willsWishes.myWill, initial.willsWishes.myWill);
  assert.deepEqual(willsWishes.lettersOfWishes, initial.willsWishes.lettersOfWishes);
  assert.equal(mutateWillsPayload(saved.payload, mutation).status, "IDEMPOTENT");
  assert.throws(() => parseWillsMutation({
    operation: "UPDATE_WISHES",
    revision: now,
    preferences: { ...draft, ownerId: "other-user" },
  }), /unsupported fields/);
});

test("desktop wishes editing validates fields and preserves nested legal records", async () => {
  const state = {
    willsWishes: structuredClone(source().willsWishes),
    unrelatedPrivateState: { retained: true },
  } as unknown as Parameters<typeof applyWishesPreferences>[0];
  const draft = { ...wishesDraftFromRecord(state.willsWishes),
    personalMessage: "Please remember the ordinary days." };
  const updated = applyWishesPreferences(state, draft, now);
  assert.equal(updated.willsWishes.personalMessage, draft.personalMessage);
  assert.equal(updated.willsWishes.updatedAt, now);
  assert.deepEqual(updated.willsWishes.myWill, state.willsWishes.myWill);
  assert.deepEqual(updated.willsWishes.lettersOfWishes, state.willsWishes.lettersOfWishes);
  assert.throws(() => applyWishesPreferences(state,
    { ...draft, ownerId: "other" } as typeof draft), /unsupported/i);
  const [page, workspace] = await Promise.all([
    readFile("app/wills/preferences/page.tsx", "utf8"),
    readFile("components/wills/preferences/WishesPreferencesWorkspace.tsx", "utf8"),
  ]);
  assert.match(page, /WishesPreferencesWorkspace/);
  assert.doesNotMatch(page, /WillsSectionPlaceholder/);
  assert.match(workspace, /applyWishesPreferences/);
  assert.match(workspace, /Review and edit/);
});

test("Wills projection fairly fits large legal histories in the encrypted cache", () => {
  const large = source();
  large.willsWishes.lettersOfWishes.letters = Array.from({ length: 100 }, (_, index) => ({
    ...large.willsWishes.lettersOfWishes.letters[0]!,
    id: `letter-${index}`,
    content: "x".repeat(50_000),
  }));
  const projected = projectWillsSnapshot(large, now);
  assert.equal(projected.counts.letters, 100);
  assert.ok(projected.letters.letters.length > 0);
  assert.ok(new TextEncoder().encode(JSON.stringify(projected)).byteLength <= 480 * 1024);
});

test("Wills mutations preserve unrelated state and replay the same letter version safely", () => {
  const letter = source().willsWishes.lettersOfWishes.letters[0]!;
  const draft = parseLetterDraft(letter);
  const versions = letter.versions;
  const mutation = parseWillsMutation({
    operation: "UPSERT_LETTER", revision: now, letter: draft, version: versions[0],
  });
  const initial = { ...source(), privateEstateData: { untouched: true } };
  initial.willsWishes.lettersOfWishes.letters = [];
  const saved = mutateWillsPayload(initial, mutation);
  assert.equal(saved.status, "OK");
  if (saved.status !== "OK") return;
  assert.deepEqual(saved.payload.privateEstateData, initial.privateEstateData);
  assert.equal(mutateWillsPayload(saved.payload, mutation).status, "IDEMPOTENT");
});

test("Letter history restores server-held content as a new idempotent version", () => {
  const initial = source();
  const letter = initial.willsWishes.lettersOfWishes.letters[0]!;
  letter.content = "A newer private message.";
  letter.versions.push({
    ...letter.versions[0]!,
    id: "letter-version-2",
    versionNumber: 2,
    content: letter.content,
  });
  const mutation = parseWillsMutation({
    operation: "RESTORE_LETTER_VERSION",
    revision: now,
    letterId: letter.id,
    versionId: "letter-version-1",
    newVersionId: "letter-version-3",
    createdAt: "2026-09-02T13:00:00.000Z",
  });
  const restored = mutateWillsPayload(initial, mutation);
  assert.equal(restored.status, "OK");
  if (restored.status !== "OK") return;
  const record = (restored.payload.willsWishes as {
    lettersOfWishes: { letters: LetterOfWishes[] };
  }).lettersOfWishes.letters[0]!;
  assert.equal(record.content, "A private message.");
  assert.equal(record.versions.at(-1)?.versionNumber, 3);
  assert.equal(record.versions.at(-1)?.id, "letter-version-3");
  assert.equal(mutateWillsPayload(restored.payload, mutation).status, "IDEMPOTENT");
  assert.throws(() => parseWillsMutation({
    ...mutation,
    content: "The client must never send historical content.",
  }), /unsupported fields/);
});

test("Wills contracts reject ownership injection and mismatched letter versions", () => {
  const letter = source().willsWishes.lettersOfWishes.letters[0]!;
  const draft = parseLetterDraft(letter);
  const versions = letter.versions;
  assert.throws(() => parseWillsMutation({
    operation: "UPSERT_LETTER", revision: now, letter: { ...draft, ownerId: "other" }, version: versions[0],
  }), /unsupported fields/);
  assert.throws(() => parseWillsMutation({
    operation: "UPSERT_LETTER", revision: now, letter: draft,
    version: { ...versions[0], content: "Different content" },
  }), /must match/);
});

test("will versions require an owned Safe Room-eligible document", () => {
  const mutation = parseWillsMutation({
    operation: "ADD_WILL_VERSION", revision: now,
    version: {
      id: "will-version-new", documentId: "document-legal", versionLabel: "Checked will",
      uploadedAt: now, signedDate: "", status: "draft", isCurrent: true,
      currentConfirmed: true, notes: "", analysisStatus: "not-requested",
      summaryReview: "unreviewed", summaryReviewNote: "",
    },
  });
  const ids = requiredWillsDocumentIds(mutation);
  assert.deepEqual(ids, ["document-legal"]);
  assert.equal(validWillsDocumentRows(mutation, ids, [{ id: "document-legal", room_id: "safe-room", room_name: "Safe Room", category: "Legal & Estate" }]), true);
  assert.equal(validWillsDocumentRows(mutation, ids, []), false);
  assert.equal(validWillsDocumentRows(mutation, ids, [{ id: "document-legal", room_id: "garden", room_name: "Garden", category: "Pets" }]), false);
});
