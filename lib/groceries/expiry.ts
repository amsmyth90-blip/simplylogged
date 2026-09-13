import type { GroceryItem } from "./model";

export function groceryExpiry(item: GroceryItem, now = new Date()) {
  if (!item.date) return { days: null, tone: "neutral", label: "Date not set" };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: item.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const today = part("year") + "-" + part("month") + "-" + part("day");
  const days = Math.round((Date.parse(item.date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
  const kind = item.dateType === "use-by" ? "Use by" : "Best before";
  const when = days === 0 ? "today" : days === 1 ? "tomorrow"
    : days < 0 ? "date passed" : "in " + days + " days";
  return { days, tone: days < 0 && item.dateType === "use-by" ? "danger" : days <= 2 ? "warning" : "neutral",
    label: kind + " " + when };
}

export function datedGroceries(items: GroceryItem[], now = new Date()) {
  return items.filter(item => !item.usedAt).map(item => ({ item, ...groceryExpiry(item, now) }))
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity) || a.item.name.localeCompare(b.item.name));
}
