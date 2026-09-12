import "server-only";
import { getSupabaseAdminClient } from "../supabase/admin.ts";
import { appointmentInstant } from "./model.ts";
import { PushDeliveryError, sendAppointmentPush } from "./push-provider.ts";

export async function deliverAppointmentNotifications() {
  const admin = getSupabaseAdminClient();
  const claimed = await admin.rpc("claim_appointment_notifications");
  if (claimed.error) throw new Error("Notification queue unavailable.");
  let sent = 0; let failed = 0;
  await Promise.all((claimed.data ?? []).map(async (job: {
    id: string; user_id: string; appointment_id: string; device_id: string;
    kind: string; start_at: string; attempts: number; lease_until: string;
  }) => {
    const update = (fields: object) => admin.from("appointment_notifications").update(fields)
      .eq("id", job.id).eq("lease_until", job.lease_until).eq("status", "sending");
    try {
      const [device, state] = await Promise.all([
        admin.from("appointment_devices").select("platform,token,user_id").eq("id", job.device_id).maybeSingle(),
        admin.from("app_state").select("payload").eq("id", job.user_id).maybeSingle(),
      ]);
      if (device.error || state.error) throw new Error("Notification source unavailable.");
      const appointment = (state.data?.payload?.health?.appointments ?? []).find((item: { id: string }) => item.id === job.appointment_id);
      let active = Boolean(device.data && device.data.user_id === job.user_id && appointment?.status === "planned");
      if (active) {
        active = appointmentInstant(appointment.date, appointment.time, appointment.timeZone ?? "Europe/London").getTime() === Date.parse(job.start_at)
          && Date.parse(job.start_at) + 60_000 > Date.now();
      }
      if (active && job.kind === "reminder") {
        const reminder = await admin.from("reminders").select("reminder_group,due_at").eq("id", appointment.reminderId).eq("user_id", job.user_id).maybeSingle();
        if (reminder.error) throw new Error("Reminder unavailable.");
        active = Boolean(reminder.data && reminder.data.reminder_group !== "done" && Date.parse(reminder.data.due_at) <= Date.now());
      }
      if (!active) { await update({ status: "cancelled", lease_until: null }); return; }
      await sendAppointmentPush(device.data!, job);
      const result = await update({ status: "sent", sent_at: new Date().toISOString(), lease_until: null });
      if (result.error) throw new Error("Delivery receipt unavailable.");
      sent++;
    } catch (error) {
      failed++;
      if (error instanceof PushDeliveryError && error.invalidToken) {
        await admin.from("appointment_devices").delete().eq("id", job.device_id).eq("user_id", job.user_id);
      } else {
        await update({ status: job.attempts >= 8 ? "failed" : "pending", lease_until: null,
          due_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000).toISOString() });
      }
    }
  }));
  return { sent, failed };
}
