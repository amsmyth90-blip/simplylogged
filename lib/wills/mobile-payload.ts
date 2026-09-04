import {
  WILLS_SCHEMA_VERSION,
  parseWillsSnapshot,
  type MobileLetterOfWishes,
  type MobileWillVersion,
  type WillsSnapshot,
} from "@diarydock/wills";

import { projectMobileLetters } from "./mobile-projection-letter.ts";
import { projectMobileWill } from "./mobile-projection-will.ts";
import { projectMobileWishes } from "./mobile-projection-wishes.ts";
import { object } from "./projection-values.ts";

const SNAPSHOT_LIMIT = 480 * 1024;

function bytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function prioritiseVersions(versions: MobileWillVersion[], currentId: string) {
  return [...versions].sort((left, right) =>
    Number(right.id === currentId) - Number(left.id === currentId),
  );
}

function fitSnapshot(
  will: ReturnType<typeof projectMobileWill>,
  letters: ReturnType<typeof projectMobileLetters>,
  wishes: ReturnType<typeof projectMobileWishes>,
  revision: string | null,
): WillsSnapshot {
  const counts = { versions: will.versions.length, letters: letters.letters.length };
  const fittedWill = { ...will, versions: [] as MobileWillVersion[] };
  const fittedLetters = { ...letters, letters: [] as MobileLetterOfWishes[] };
  const base = {
    schemaVersion: WILLS_SCHEMA_VERSION,
    revision,
    counts,
    wishes,
    will: fittedWill,
    letters: fittedLetters,
  };
  let size = bytes(base);
  const versions = prioritiseVersions(will.versions, will.currentVersionId);
  const maximum = Math.max(versions.length, letters.letters.length);
  for (let index = 0; index < maximum; index += 1) {
    const candidates = [
      [versions[index], fittedWill.versions],
      [letters.letters[index], fittedLetters.letters],
    ] as Array<[MobileWillVersion | MobileLetterOfWishes | undefined, unknown[]]>;
    for (const [entry, target] of candidates) {
      if (!entry || target.length >= 100) continue;
      const entrySize = bytes(entry) + 1;
      if (size + entrySize > SNAPSHOT_LIMIT) continue;
      target.push(entry);
      size += entrySize;
    }
  }
  if (!fittedWill.versions.some((entry) => entry.id === fittedWill.currentVersionId)) {
    fittedWill.currentVersionId = "";
  }
  return parseWillsSnapshot(base);
}

export function projectWillsSnapshot(payload: unknown, revision: string | null) {
  const root = object(payload);
  const wishes = object(root.willsWishes);
  const will = projectMobileWill(wishes.myWill);
  const letters = projectMobileLetters(wishes.lettersOfWishes);
  const preferences = projectMobileWishes(wishes);
  return fitSnapshot(will, letters, preferences, revision);
}

export { mutateWillsPayload } from "./mobile-mutation.ts";
