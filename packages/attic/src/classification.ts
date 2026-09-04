import type { AtticSectionId } from "./types.ts";

type AtticItem = {
  category?: string;
  kind?: string;
  note?: string;
  roomId?: string;
  roomName?: string;
  title?: string;
};

const terms: Record<AtticSectionId, string[]> = {
  "photo-albums": ["photo", "album", "picture", "image", "portrait"],
  keepsakes: ["keepsake", "heirloom", "treasure", "item", "memento"],
  "family-history": ["family", "history", "ancestor", "timeline", "story", "genealogy"],
  "letters-journals": ["letter", "journal", "diary", "transcription", "postcard"],
  "memory-box": ["memory", "voice note", "moment", "recollection", "legacy"],
};

function searchable(item: AtticItem) {
  return [item.title, item.category, item.kind, item.note]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function belongsInAttic(item: AtticItem) {
  return item.roomId === "attic" || item.roomName?.toLowerCase() === "attic";
}

export function atticItemMatches(item: AtticItem, section: AtticSectionId) {
  if (!belongsInAttic(item)) return false;
  const content = searchable(item);
  if (section === "photo-albums" && item.kind?.toLowerCase() === "image") {
    return true;
  }
  return terms[section].some((term) => content.includes(term));
}
