export type RecapKind = "daily" | "weekly";
export type RecapPreferences = { daily: boolean; weekly: boolean; push: boolean; timeZone: string; dailyTime: string; weeklyTime: string };
export type RecapItem = { id: string; title: string; dueAt: string; target: "reminders" | "appointments"; overdue: boolean };
export type Recap = { kind: RecapKind; date: string; through: string; items: RecapItem[]; truncated: boolean };
export type RecapResponse = { preferences: RecapPreferences; daily: Recap; weekly: Recap; pushAvailable: boolean };

export function parseRecapPreferences(value: unknown): RecapPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Check your recap settings.");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !["daily", "weekly", "push", "timeZone", "dailyTime", "weeklyTime"].includes(key))
    || typeof row.daily !== "boolean" || typeof row.weekly !== "boolean" || typeof row.push !== "boolean"
    || typeof row.timeZone !== "string" || row.timeZone.length > 64 || (!row.timeZone.includes("/") && row.timeZone !== "UTC")) {
    throw new Error("Check your recap settings and time zone.");
  }
  try { new Intl.DateTimeFormat("en", { timeZone: row.timeZone }).format(); }
  catch { throw new Error("Choose a valid time zone, such as Europe/London."); }
  const dailyTime = row.dailyTime === undefined ? "08:00" : row.dailyTime;
  const weeklyTime = row.weeklyTime === undefined ? "20:00" : row.weeklyTime;
  for (const time of [dailyTime, weeklyTime]) {
    if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid recap time.");
  }
  return { daily: row.daily, weekly: row.weekly, push: row.push, timeZone: row.timeZone, dailyTime: dailyTime as string, weeklyTime: weeklyTime as string };
}

export function localDate(now: Date, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function buildRecap(kind: RecapKind, items: Omit<RecapItem, "overdue">[], timeZone: string, now = new Date(), truncated = false): Recap {
  const date = localDate(now, timeZone);
  const through = kind === "daily" ? date : addDays(date, 7);
  const seen = new Set<string>();
  const visible = items.filter((item) => Number.isFinite(Date.parse(item.dueAt)))
    .map((item) => ({ ...item, overdue: localDate(new Date(item.dueAt), timeZone) < date }))
    .filter((item) => localDate(new Date(item.dueAt), timeZone) <= through)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .filter((item) => { const key = `${item.target}:${item.id}`; if (seen.has(key)) return false; seen.add(key); return true; });
  return { kind, date, through, items: visible.slice(0, 100), truncated: truncated || visible.length > 100 };
}
