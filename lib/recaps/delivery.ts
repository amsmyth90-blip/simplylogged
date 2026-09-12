import "server-only";
import { getSupabaseAdminClient } from "../supabase/admin.ts";
import { PushDeliveryError, sendDiaryDockPush } from "../appointments/push-provider.ts";
export async function deliverRecapNotifications() {
  const admin = getSupabaseAdminClient();
  const claimed = await admin.rpc("claim_recap_notifications");
  if (claimed.error) throw new Error("Recap queue unavailable.");
  let sent = 0; let failed = 0;
  await Promise.all((claimed.data ?? []).map(async (job: {
    id: string; user_id: string; device_id: string; kind: "daily" | "weekly";
    attempts: number; lease_until: string; time_zone: string; expires_at: string; scheduled_time: string | null;
  }) => {
    const update = (fields: object) => admin.from("recap_notifications").update(fields)
      .eq("id", job.id).eq("lease_until", job.lease_until).eq("status", "sending");
    try {
      const [device, prefs] = await Promise.all([
        admin.from("appointment_devices").select("platform,token,user_id,updated_at").eq("id", job.device_id).maybeSingle(),
        admin.from("recap_preferences").select("daily,weekly,push,time_zone,daily_time,weekly_time").eq("user_id", job.user_id).maybeSingle(),
      ]);
      if (device.error || prefs.error) throw new Error("Recap source unavailable.");
      // Recheck consent and device ownership immediately before delivery.
      if (!device.data || device.data.user_id !== job.user_id || !prefs.data?.push
        || !prefs.data[job.kind] || prefs.data.time_zone !== job.time_zone
        || prefs.data[job.kind === "daily" ? "daily_time" : "weekly_time"] !== (job.scheduled_time ?? (job.kind === "weekly" ? "20:00:00" : "08:00:00")) || Date.parse(job.expires_at) <= Date.now()
        || Date.parse(device.data.updated_at) < Date.now() - 90 * 86400000) {
        await update({ status: "cancelled", lease_until: null }); return;
      }
      const body = job.kind === "daily" ? "Your morning recap is ready. Open DiaryDock to see your day."
        : "Your Sunday recap is ready. Open DiaryDock to review the week ahead.";
      await sendDiaryDockPush(device.data, job.id, body, job.kind === "weekly" ? "recaps-weekly" : "recaps");
      const result = await update({ status: "sent", sent_at: new Date().toISOString(), lease_until: null });
      if (result.error) throw new Error("Recap receipt unavailable.");
      sent++;
    } catch (error) {
      failed++;
      if (error instanceof PushDeliveryError && error.invalidToken) {
        await admin.from("appointment_devices").delete().eq("id", job.device_id).eq("user_id", job.user_id);
      } else await update({ status: job.attempts >= 8 ? "failed" : "pending", lease_until: null,
        due_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000).toISOString() });
    }
  }));
  return { sent, failed };
}
