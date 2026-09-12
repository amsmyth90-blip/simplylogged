export type AppointmentDraft = {
  title: string;
  provider: string;
  location: string;
  date: string;
  time: string;
  timeZone: string;
  durationMinutes: number;
  preparationNotes: string;
};

export type AppointmentAnalysis = Omit<AppointmentDraft, "timeZone" | "durationMinutes"> & {
  reviewReasons: string[];
};

export const emptyAppointment: AppointmentDraft = {
  title: "", provider: "", location: "", date: "", time: "",
  timeZone: "Europe/London", durationMinutes: 30, preparationNotes: "",
};

export function parseAppointmentAnalysis(value: unknown): AppointmentAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid letter details.");
  const row = value as Record<string, unknown>;
  const result = {} as AppointmentAnalysis;
  for (const [key, limit] of Object.entries({ title: 200, provider: 200, location: 300,
    date: 10, time: 5, preparationNotes: 4000 })) {
    if (typeof row[key] !== "string" || row[key].length > limit) throw new Error("Invalid letter details.");
    Object.assign(result, { [key]: row[key].trim() });
  }
  if (!Array.isArray(row.reviewReasons) || row.reviewReasons.length > 12
    || row.reviewReasons.some((item) => typeof item !== "string" || item.length > 300)) {
    throw new Error("Invalid letter review notes.");
  }
  result.reviewReasons = [...row.reviewReasons];
  return result;
}

// Resolve the appointment's wall time in its selected zone, independently of the
// phone/server timezone. Reject skipped and repeated DST times instead of guessing.
export function appointmentInstant(date: string, time: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Enter the full appointment date and time.");
  }
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 10) !== date) {
    throw new Error("Enter a valid appointment date.");
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  } catch { throw new Error("Choose a valid time zone, such as Europe/London."); }
  const local = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
    return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  };
  const offsets = new Set([-86400000, 0, 86400000].map((delta) => local(wall + delta) - (wall + delta)));
  const matches = [...offsets].map((offset) => wall - offset).filter((instant) => local(instant) === wall);
  if (matches.length !== 1) throw new Error("This time falls during a clock change. Confirm a different time with the provider.");
  return new Date(matches[0]!);
}

export function parseAppointmentDraft(value: unknown): AppointmentDraft {
  const analysis = parseAppointmentAnalysis({ ...(value as object), reviewReasons: [] });
  const row = value as Record<string, unknown>;
  if (!analysis.title || typeof row.timeZone !== "string" || row.timeZone.length > 64
    || !Number.isInteger(row.durationMinutes) || Number(row.durationMinutes) < 5 || Number(row.durationMinutes) > 1440) {
    throw new Error("Check the title, time zone and appointment duration.");
  }
  appointmentInstant(analysis.date, analysis.time, row.timeZone);
  return { title: analysis.title, provider: analysis.provider, location: analysis.location,
    date: analysis.date, time: analysis.time, preparationNotes: analysis.preparationNotes,
    timeZone: row.timeZone, durationMinutes: Number(row.durationMinutes) };
}

export const reminderOffsets = [0, 15, 60, 1440, 2880, 10080] as const;

export function appointmentSchedule(draft: AppointmentDraft, offset: number | null) {
  const start = appointmentInstant(draft.date, draft.time, draft.timeZone);
  if (offset !== null && !(reminderOffsets as readonly number[]).includes(offset)) {
    throw new Error("Choose a supported reminder time.");
  }
  return { startAt: start.toISOString(),
    endAt: new Date(start.getTime() + draft.durationMinutes * 60_000).toISOString(),
    remindAt: offset === null ? null : new Date(start.getTime() - offset * 60_000).toISOString() };
}
