import { array, exact, record, revision, text } from "./helpers.ts";
import {
  KITCHEN_SCHEMA_VERSION,
  type KitchenItem,
  type KitchenSection,
  type KitchenSnapshot,
} from "./types.ts";

function section(value: unknown): KitchenSection {
  if (value !== "Pantry" && value !== "Shopping") {
    throw new Error("Kitchen section is invalid.");
  }
  return value;
}

function item(value: unknown): KitchenItem {
  const entry = record(value, "Kitchen item");
  exact(entry, ["id", "name", "checked", "section"], "Kitchen item");
  if (typeof entry.checked !== "boolean") throw new Error("Kitchen item status is invalid.");
  return {
    id: text(entry.id, "Kitchen item ID", 128),
    name: text(entry.name, "Kitchen item name", 120),
    checked: entry.checked,
    section: section(entry.section),
  };
}

export function parseKitchenSnapshot(value: unknown): KitchenSnapshot {
  const snapshot = record(value, "Kitchen snapshot");
  exact(snapshot, ["schemaVersion", "revision", "items"], "Kitchen snapshot");
  if (snapshot.schemaVersion !== KITCHEN_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the Kitchen.");
  }
  return {
    schemaVersion: KITCHEN_SCHEMA_VERSION,
    revision: revision(snapshot.revision),
    items: array(snapshot.items, "Kitchen items", 300).map(item),
  };
}

export { section as parseKitchenSection };
