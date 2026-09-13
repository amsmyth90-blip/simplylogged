export type GroceryDraft = {
  id: string; name: string; quantity: string; date: string;
  dateType: "use-by" | "best-before" | "unknown"; dateText: string;
};
export type GroceryItem = GroceryDraft & { timeZone: string; usedAt: string | null };
export type GroceryCommand =
  | { operation: "SAVE"; batchId: string; confirmed: true; timeZone: string; items: GroceryDraft[] }
  | { operation: "USE"; id: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validDate(date: string) {
  return /^20\d{2}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date + "T12:00:00Z"))
    && new Date(date + "T12:00:00Z").toISOString().slice(0,10) === date;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid grocery details.");
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) throw Error("Invalid grocery fields.");
}
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f]/.test(value) || (!empty && !value.trim())) throw Error("Check your grocery details.");
  return value.trim();
}
export function parseDraft(value: unknown): GroceryDraft {
  const row = object(value); exact(row, ["id","name","quantity","date","dateType","dateText"]);
  const id = text(row.id,36);
  if (!uuid.test(id)) throw Error("Invalid grocery ID.");
  const date = text(row.date,10,true);
  const dateType = row.dateType;
  if (!["use-by","best-before","unknown"].includes(String(dateType))) throw Error("Check the date label.");
  if (date && (!validDate(date) || dateType === "unknown")) throw Error("Confirm the complete date and its label.");
  return { id, name:text(row.name,120), quantity:text(row.quantity,80,true), date,
    dateType:dateType as GroceryDraft["dateType"], dateText:text(row.dateText,160,true) };
}
export function parseCommand(value: unknown): GroceryCommand {
  const row = object(value);
  if (row.operation === "USE") {
    exact(row,["operation","id"]); const id = text(row.id,36);
    if (!uuid.test(id)) throw Error("Invalid grocery ID."); return { operation:"USE",id };
  }
  exact(row,["operation","batchId","confirmed","timeZone","items"]);
  if (row.operation !== "SAVE" || row.confirmed !== true || !uuid.test(String(row.batchId))
    || !Array.isArray(row.items) || row.items.length < 1 || row.items.length > 40) throw Error("Confirm between 1 and 40 products.");
  const timeZone = text(row.timeZone,64);
  try { new Intl.DateTimeFormat("en",{timeZone}).format(); } catch { throw Error("Invalid time zone."); }
  const items = row.items.map(parseDraft);
  if (new Set(items.map(item => item.id)).size !== items.length) throw Error("Duplicate product IDs.");
  return { operation:"SAVE", batchId:String(row.batchId), confirmed:true, timeZone, items };
}
export function reminderDates(date: string) {
  if (!validDate(date)) throw Error("Invalid date.");
  return [2,1].map(days => {
    const value = new Date(date + "T12:00:00Z"); value.setUTCDate(value.getUTCDate() - days);
    return { days, date:value.toISOString().slice(0,10) };
  });
}
