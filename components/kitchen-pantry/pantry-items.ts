import type { KitchenListItem } from "@/lib/diarydock-data";

export function normaliseKitchenItem(value: string) {
  return value.trim().toLocaleLowerCase("en-GB");
}

export function mergeKitchenItems(
  current: KitchenListItem[],
  names: string[],
  section: KitchenListItem["section"],
) {
  const existing = new Set(current.map((item) => `${item.section}:${normaliseKitchenItem(item.name)}`));
  const additions: KitchenListItem[] = [];
  for (const name of names) {
    const clean = name.trim();
    const key = `${section}:${normaliseKitchenItem(clean)}`;
    if (!clean || existing.has(key)) continue;
    existing.add(key);
    additions.push({
      id: crypto.randomUUID(),
      name: clean,
      checked: section === "Pantry",
      section,
    });
  }
  return [...current, ...additions];
}
