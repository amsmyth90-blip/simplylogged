import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRecap, type RecapItem, type RecapPreferences } from "./model.ts";
import { appointmentInstant } from "../appointments/model.ts";

export async function loadRecaps(client: SupabaseClient, userId: string, fallbackZone: string) {
  // These reads use the signed-in client's RLS, including current household membership.
  const [settings, reminders, state] = await Promise.all([
    client.from("recap_preferences").select("daily,weekly,push,time_zone,daily_time,weekly_time").eq("user_id", userId).maybeSingle(),
    client.from("reminders").select("id,title,due_at,source_due_at")
      .neq("reminder_group", "done").order("due_at", { ascending: true, nullsFirst: false }).limit(1000),
    client.from("app_state").select("payload").eq("id", userId).maybeSingle(),
  ]);
  if (settings.error || reminders.error || state.error) throw new Error("Recaps could not load. Please retry.");
  const preferences: RecapPreferences = settings.data
    ? { daily: settings.data.daily, weekly: settings.data.weekly, push: settings.data.push, timeZone: settings.data.time_zone,
      dailyTime: settings.data.daily_time.slice(0, 5), weeklyTime: settings.data.weekly_time.slice(0, 5) }
    : { daily: false, weekly: false, push: false, timeZone: fallbackZone, dailyTime: "08:00", weeklyTime: "20:00" };
  const appointments = Array.isArray(state.data?.payload?.health?.appointments) ? state.data.payload.health.appointments : [];
  const linked = new Set<string>();
  const items: Omit<RecapItem, "overdue">[] = [];
  for (const item of appointments) {
    if (item.status !== "planned") continue;
    try {
      const dueAt = appointmentInstant(item.date, item.time, item.timeZone ?? preferences.timeZone).toISOString();
      items.push({ id: item.id, title: item.title, dueAt, target: "appointments" });
      if (item.reminderId) linked.add(item.reminderId);
    } catch { /* Invalid legacy dates stay available in Health, but cannot be scheduled. */ }
  }
  for (const row of reminders.data ?? []) {
    if (!linked.has(row.id) && (row.source_due_at || row.due_at)) items.push({
      id: row.id, title: row.title, dueAt: row.source_due_at || row.due_at, target: "reminders",
    });
  }
  const now = new Date();
  return { preferences, daily: buildRecap("daily", items, preferences.timeZone, now, reminders.data?.length === 1000),
    weekly: buildRecap("weekly", items, preferences.timeZone, now, reminders.data?.length === 1000) };
}
