import { getGardenSection } from "./sections.ts";
import type {
  GardenDocumentCandidate,
  GardenReminderCandidate,
  GardenSectionId,
} from "./types.ts";

function includesTerm(value: string, terms: string[]) {
  const normalised = value.toLocaleLowerCase("en-GB");
  return terms.some((term) => normalised.includes(term));
}

export function gardenDocumentMatches(
  candidate: GardenDocumentCandidate,
  sectionId: GardenSectionId,
) {
  const section = getGardenSection(sectionId);
  const text = [
    candidate.title,
    candidate.category,
    candidate.kind,
    candidate.issuer,
  ]
    .filter(Boolean)
    .join(" ");
  if (candidate.roomId === "garden" && sectionId === "jobs") return true;
  return includesTerm(text, section.documentTerms);
}

export function gardenReminderMatches(
  candidate: GardenReminderCandidate,
  sectionId: GardenSectionId,
) {
  if (candidate.group === "done") return false;
  const section = getGardenSection(sectionId);
  const text = [candidate.title, candidate.note, candidate.roomName]
    .filter(Boolean)
    .join(" ");
  if (candidate.roomId === "garden" && sectionId === "jobs") return true;
  return includesTerm(text, section.reminderTerms);
}

export function belongsInGarden(candidate: {
  roomId?: string;
  roomName?: string;
}) {
  return (
    candidate.roomId === "garden" ||
    candidate.roomName?.toLocaleLowerCase("en-GB") === "garden"
  );
}
