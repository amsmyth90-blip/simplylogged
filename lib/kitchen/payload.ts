import {
  KITCHEN_SCHEMA_VERSION,
  parseKitchenSnapshot,
  type KitchenItem,
  type KitchenMutation,
  type KitchenSnapshot,
} from "@diarydock/kitchen";

type AppStatePayload = Record<string, unknown>;
type MutationResult =
  | { status: "OK"; payload: AppStatePayload }
  | { status: "CAPACITY" | "DUPLICATE" | "NOT_FOUND"; payload: null };

function object(value: unknown): AppStatePayload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as AppStatePayload
    : {};
}

function validKitchenItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  const items: KitchenItem[] = [];
  const ids = new Set<string>();
  for (const candidate of value.slice(0, 300)) {
    try {
      const parsed = parseKitchenSnapshot({
        schemaVersion: KITCHEN_SCHEMA_VERSION,
        revision: null,
        items: [candidate],
      }).items[0];
      if (parsed && !ids.has(parsed.id)) {
        ids.add(parsed.id);
        items.push(parsed);
      }
    } catch { /* Malformed legacy entries are excluded from the mobile projection. */ }
  }
  return items;
}

export function projectKitchenSnapshot(payload: unknown, revision: string | null): KitchenSnapshot {
  return parseKitchenSnapshot({
    schemaVersion: KITCHEN_SCHEMA_VERSION,
    revision,
    items: validKitchenItems(object(payload).kitchenItems),
  });
}

function normalise(value: string) {
  return value.trim().toLocaleLowerCase("en-GB");
}

export function mutateKitchenPayload(
  current: unknown,
  mutation: KitchenMutation,
  createId: () => string = () => crypto.randomUUID(),
): MutationResult {
  const payload = structuredClone(object(current));
  const rawItems = Array.isArray(payload.kitchenItems) ? [...payload.kitchenItems] : [];
  const valid = validKitchenItems(rawItems);
  if (mutation.operation === "ADD_ITEM") {
    if (valid.length >= 300) return { status: "CAPACITY", payload: null };
    const duplicate = valid.some((item) => item.section === mutation.section
      && normalise(item.name) === normalise(mutation.name));
    if (duplicate) return { status: "DUPLICATE", payload: null };
    payload.kitchenItems = [...rawItems, {
      id: `kitchen-${createId()}`,
      name: mutation.name,
      checked: mutation.section === "Pantry",
      section: mutation.section,
    }];
    return { status: "OK", payload };
  }
  const index = rawItems.findIndex((entry) => object(entry).id === mutation.itemId);
  if (index < 0) return { status: "NOT_FOUND", payload: null };
  if (mutation.operation === "DELETE_ITEM") {
    rawItems.splice(index, 1);
  } else {
    const item = object(rawItems[index]);
    rawItems[index] = mutation.operation === "TOGGLE_ITEM"
      ? { ...item, checked: !item.checked }
      : { ...item, section: mutation.section, checked: mutation.section === "Pantry" };
  }
  payload.kitchenItems = rawItems;
  return { status: "OK", payload };
}
