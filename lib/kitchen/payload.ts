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
  if (mutation.operation === "ADD_ITEM" || mutation.operation === "ADD_ITEMS") {
    const names = mutation.operation === "ADD_ITEM" ? [mutation.name] : mutation.names;
    const existing = new Set(valid.filter((item) => item.section === mutation.section)
      .map((item) => normalise(item.name)));
    const additions: KitchenItem[] = [];
    for (const name of names) {
      const key = normalise(name);
      if (existing.has(key)) continue;
      existing.add(key);
      additions.push({ id: `kitchen-${createId()}`, name,
        checked: mutation.section === "Pantry", section: mutation.section });
    }
    if (!additions.length) return mutation.operation === "ADD_ITEMS"
      ? { status: "OK", payload }
      : { status: "DUPLICATE", payload: null };
    if (valid.length + additions.length > 300) return { status: "CAPACITY", payload: null };
    payload.kitchenItems = [...rawItems, ...additions];
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
