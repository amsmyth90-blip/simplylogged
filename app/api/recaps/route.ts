import { appointmentAuth, appointmentResponse } from "@/lib/appointments/request";
import { pushConfigured } from "@/lib/appointments/push-provider";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { mobilePreflight } from "@/lib/http/mobile-cors";
import { loadRecaps } from "@/lib/recaps/service";
import { parseRecapPreferences } from "@/lib/recaps/model";
export const runtime = "nodejs";
export const OPTIONS = mobilePreflight;
export async function GET(request: Request) {
  const auth = await appointmentAuth(request, "recaps-read", 120);
  if (auth.response) return auth.response;
  try {
    let zone = new URL(request.url).searchParams.get("timeZone") || "Europe/London";
    try { zone = parseRecapPreferences({ daily: false, weekly: false, push: false, timeZone: zone }).timeZone; }
    catch { zone = "Europe/London"; }
    return appointmentResponse(request, { ...await loadRecaps(auth.supabase, auth.user.id, zone),
      pushAvailable: pushConfigured("ios") || pushConfigured("android") });
  } catch { return appointmentResponse(request, { error: "Recaps are temporarily unavailable. Please retry." }, 503); }
}
export async function POST(request: Request) {
  const auth = await appointmentAuth(request, "recaps-write", 60);
  if (auth.response) return auth.response;
  let settings; let body: Record<string, unknown>;
  try { body = await readBoundedJson(request, 2048) as Record<string, unknown>; settings = parseRecapPreferences(body); }
  catch (error) { return appointmentResponse(request, { error: error instanceof Error ? error.message : "Invalid settings." }, 400); }
  const result = await auth.supabase.from("recap_preferences").upsert({ user_id: auth.user.id,
    daily: settings.daily, weekly: settings.weekly, push: settings.push, time_zone: settings.timeZone,
    ...(body.dailyTime === undefined ? {} : { daily_time: settings.dailyTime }),
    ...(body.weeklyTime === undefined ? {} : { weekly_time: settings.weeklyTime }),
    updated_at: new Date().toISOString() }).select("daily_time,weekly_time").single();
  if (result.error) return appointmentResponse(request, { error: "Recap settings could not save. Please retry." }, 503);
  return appointmentResponse(request, { preferences: { ...settings, dailyTime: result.data.daily_time.slice(0, 5), weeklyTime: result.data.weekly_time.slice(0, 5) } });
}
