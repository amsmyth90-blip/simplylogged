import { exact, record, revision, text } from "./helpers.ts";
import { parseKitchenSection } from "./parser.ts";
import type { KitchenMutation } from "./types.ts";

export function parseKitchenMutation(value: unknown): KitchenMutation {
  const mutation = record(value, "Kitchen update");
  const operation = mutation.operation;
  if (operation === "ADD_ITEM") {
    exact(mutation, ["operation", "revision", "name", "section"], "Kitchen update");
    return {
      operation,
      revision: revision(mutation.revision),
      name: text(mutation.name, "Kitchen item name", 120),
      section: parseKitchenSection(mutation.section),
    };
  }
  if (operation === "ADD_ITEMS") {
    exact(mutation, ["operation", "revision", "names", "section"], "Kitchen update");
    if (!Array.isArray(mutation.names) || mutation.names.length < 1 || mutation.names.length > 120) {
      throw new Error("Kitchen items are invalid.");
    }
    return {
      operation,
      revision: revision(mutation.revision),
      names: mutation.names.map((name) => text(name, "Kitchen item name", 120)),
      section: parseKitchenSection(mutation.section),
    };
  }
  if (operation === "MOVE_ITEM") {
    exact(mutation, ["operation", "revision", "itemId", "section"], "Kitchen update");
    return {
      operation,
      revision: revision(mutation.revision),
      itemId: text(mutation.itemId, "Kitchen item ID", 128),
      section: parseKitchenSection(mutation.section),
    };
  }
  if (operation === "TOGGLE_ITEM" || operation === "DELETE_ITEM") {
    exact(mutation, ["operation", "revision", "itemId"], "Kitchen update");
    return {
      operation,
      revision: revision(mutation.revision),
      itemId: text(mutation.itemId, "Kitchen item ID", 128),
    };
  }
  throw new Error("Kitchen update operation is invalid.");
}
