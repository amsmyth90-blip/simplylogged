import type { MobileLettersOfWishesRecord } from "./letter-types.ts";
import { parseMobileLettersRecord } from "./parse-letter.ts";
import { parseMobileWillRecord } from "./parse-will.ts";
import { parseWishesPreferences } from "./parse-wishes.ts";
import type { WishesPreferences } from "./wishes-types.ts";
import {
  WILLS_SCHEMA_VERSION,
  type MobileWillRecord,
} from "./will-types.ts";
import { exact, record, revision } from "./validation.ts";

export type WillsSnapshot = {
  schemaVersion: typeof WILLS_SCHEMA_VERSION;
  revision: string | null;
  counts: { letters: number; versions: number };
  wishes: WishesPreferences;
  will: MobileWillRecord;
  letters: MobileLettersOfWishesRecord;
};

function count(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 10_000) {
    throw new Error(`${label} is invalid.`);
  }
  return Number(value);
}

export function parseWillsSnapshot(value: unknown): WillsSnapshot {
  const item = record(value, "Wills snapshot");
  exact(item, ["schemaVersion", "revision", "counts", "wishes", "will", "letters"], "Wills snapshot");
  if (item.schemaVersion !== WILLS_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the Safe Room.");
  }
  const counts = record(item.counts, "Wills counts");
  exact(counts, ["letters", "versions"], "Wills counts");
  return {
    schemaVersion: WILLS_SCHEMA_VERSION,
    revision: revision(item.revision),
    counts: {
      letters: count(counts.letters, "Letter count"),
      versions: count(counts.versions, "Will version count"),
    },
    wishes: parseWishesPreferences(item.wishes),
    will: parseMobileWillRecord(item.will),
    letters: parseMobileLettersRecord(item.letters),
  };
}
