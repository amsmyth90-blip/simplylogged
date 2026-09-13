import test from "node:test";
import assert from "node:assert/strict";
import { groceryExpiry, datedGroceries } from "../lib/groceries/expiry.ts";
import type { GroceryItem } from "../lib/groceries/model.ts";
const item: GroceryItem = { id: "milk", name: "Milk", quantity: "1 litre", date: "2026-10-26",
  dateType: "use-by", dateText: "", timeZone: "Europe/London", usedAt: null };
test("grocery dates count local calendar days across daylight saving", () => {
  assert.equal(groceryExpiry(item, new Date("2026-10-24T23:30:00Z")).days, 1);
  assert.equal(groceryExpiry(item, new Date("2026-10-25T23:30:00Z")).days, 1);
  assert.equal(groceryExpiry(item, new Date("2026-10-26T00:01:00Z")).days, 0);
  assert.equal(groceryExpiry({ ...item, timeZone: "America/Los_Angeles" }, new Date("2026-10-26T00:01:00Z")).days, 1);
});
test("passed use-by dates are distinct from best-before quality dates and missing dates", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  assert.deepEqual(groceryExpiry(item, now), { days: -1, tone: "danger", label: "Use by date passed" });
  assert.deepEqual(groceryExpiry({ ...item, dateType: "best-before" }, now),
    { days: -1, tone: "warning", label: "Best before date passed" });
  assert.deepEqual(groceryExpiry({ ...item, date: "", dateType: "unknown" }, now),
    { days: null, tone: "neutral", label: "Date not set" });
});
test("shopping date list excludes used products and puts missing dates last", () => {
  const rows = datedGroceries([{ ...item, id: "unknown", date: "" },
    { ...item, id: "used", usedAt: "2026-10-25T00:00:00Z" }, item,
    { ...item, id: "earlier", date: "2026-10-25" }], new Date("2026-10-24T12:00:00Z"));
  assert.deepEqual(rows.map(row => row.item.id), ["earlier", "milk", "unknown"]);
  assert.equal(rows[1].tone, "warning");
});
