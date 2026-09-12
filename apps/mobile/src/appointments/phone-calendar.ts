import { Capacitor } from "@capacitor/core";
import { Calendar } from "@capacitor/calendar";
import { appointmentSchedule, type AppointmentDraft } from "../../../../lib/appointments/model.ts";
import { downloadAppointmentCalendar } from "../../../../lib/appointments/calendar.ts";

const completed = new Set<string>();
export async function addPhoneAppointment(id: string, draft: AppointmentDraft, offset: number | null) {
  if (!Capacitor.isNativePlatform()) { downloadAppointmentCalendar(id, draft, offset); return; }
  if (completed.has(id)) return;
  const permission = await Calendar.requestPermissions({ permissions: ["writeCalendar"] });
  if (permission.writeCalendar !== "granted") throw new Error("Calendar permission is required.");
  const schedule = appointmentSchedule(draft, offset);
  const event = await Calendar.createEvent({ title: draft.title, location: draft.location,
    notes: "Open DiaryDock to view your appointment letter and preparation notes.",
    startDate: Date.parse(schedule.startAt), endDate: Date.parse(schedule.endAt),
    ...(offset === null ? {} : { firstReminderMinutes: offset }) });
  if (!event.id) throw new Error("Calendar did not confirm the event.");
  completed.add(id);
}
