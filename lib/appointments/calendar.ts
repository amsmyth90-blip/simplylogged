import { appointmentSchedule, type AppointmentDraft } from "./model.ts";

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function fold(line: string) {
  const lines: string[] = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > 75) {
      lines.push(current); current = " ";
    }
    current += char;
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function appointmentCalendar(id: string, draft: AppointmentDraft, offset: number | null, now = new Date()) {
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(id)) throw new Error("Invalid appointment identifier.");
  const schedule = appointmentSchedule(draft, offset);
  const stamp = (value: string) => value.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DiaryDock//Appointments//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${id}@diarydock`, `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(schedule.startAt)}`, `DTEND:${stamp(schedule.endAt)}`,
    `SUMMARY:${escapeText(draft.title)}`, `LOCATION:${escapeText(draft.location)}`,
    "DESCRIPTION:Appointment saved in DiaryDock. Open DiaryDock to view your letter and preparation notes.",
    "CLASS:PRIVATE", ...(offset === null ? [] : ["BEGIN:VALARM", "ACTION:DISPLAY",
      "DESCRIPTION:Appointment reminder", `TRIGGER:-PT${offset}M`, "END:VALARM"]),
    "END:VEVENT", "END:VCALENDAR", ""].map(fold).join("\r\n");
}

export function downloadAppointmentCalendar(id: string, draft: AppointmentDraft, offset: number | null) {
  const url = URL.createObjectURL(new Blob([appointmentCalendar(id, draft, offset)], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "diarydock-appointment.ics";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
