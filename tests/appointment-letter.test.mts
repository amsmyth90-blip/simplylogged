import assert from "node:assert/strict";
import test from "node:test";
import { appointmentInstant, appointmentSchedule, emptyAppointment, parseAppointmentAnalysis, parseAppointmentDraft } from "../lib/appointments/model.ts";
import { appointmentCalendar } from "../lib/appointments/calendar.ts";
import { parseHealthMutation } from "../packages/health/src/mutation.ts";

const draft = { ...emptyAppointment, title: "Clinic visit", provider: "Example clinic",
  date: "2026-09-18", time: "10:30", location: "Clinic, 1 Main Street" };

test("letter analysis keeps missing details empty and rejects invalid output", () => {
  const result = parseAppointmentAnalysis({ ...draft, date: "", time: "", reviewReasons: ["No appointment time is visible."] });
  assert.equal(result.time, "");
  assert.throws(() => parseAppointmentDraft(result));
  assert.throws(() => parseAppointmentAnalysis({ ...draft, title: 123, reviewReasons: [] }));
  assert.throws(() => parseAppointmentAnalysis({ ...draft, reviewReasons: Array(13).fill("unclear") }));
});

test("appointment scheduling uses the selected time zone through British clock changes", () => {
  assert.equal(appointmentInstant("2026-09-18", "10:30", "Europe/London").toISOString(), "2026-09-18T09:30:00.000Z");
  assert.equal(appointmentInstant("2026-12-18", "10:30", "Europe/London").toISOString(), "2026-12-18T10:30:00.000Z");
  assert.equal(appointmentInstant("2026-09-18", "10:30", "Asia/Kolkata").toISOString(), "2026-09-18T05:00:00.000Z");
  assert.throws(() => appointmentInstant("2026-03-29", "01:30", "Europe/London"), /clock change/);
  assert.throws(() => appointmentInstant("2026-10-25", "01:30", "Europe/London"), /clock change/);
});

test("invalid dates, missing times and unknown timezones cannot become appointments", () => {
  for (const [date, time, zone] of [["2026-02-30", "10:30", "UTC"], ["2026-09-18", "24:00", "UTC"],
    ["2026-09-18", "", "UTC"], ["2026-09-18", "10:30", "Nowhere"]]) {
    assert.throws(() => appointmentInstant(date!, time!, zone!));
  }
  assert.throws(() => parseAppointmentDraft({ ...draft, durationMinutes: 0 }));
  assert.throws(() => appointmentSchedule(draft, -1));
});

test("reminder and calendar timestamps agree", () => {
  const schedule = appointmentSchedule(draft, 1440);
  assert.equal(schedule.remindAt, "2026-09-17T09:30:00.000Z");
  assert.equal(schedule.endAt, "2026-09-18T10:00:00.000Z");
  assert.equal(appointmentSchedule(draft, null).remindAt, null);
  assert.equal(appointmentSchedule(draft, 0).remindAt, schedule.startAt);
});

test("calendar export escapes injection, folds UTF-8 lines and excludes preparation notes", () => {
  const ics = appointmentCalendar("example-id", { ...draft, title: "Visit\r\nBEGIN:VEVENT;\\",
    location: "é".repeat(160), preparationNotes: "PRIVATE PREPARATION INSTRUCTIONS" }, 60);
  assert.equal(ics.split("\r\nBEGIN:VEVENT").length, 2);
  assert.match(ics, /SUMMARY:Visit\\nBEGIN:VEVENT\\;\\\\/);
  assert.match(ics, /DTSTART:20260918T093000Z/);
  assert.match(ics, /TRIGGER:-PT60M/);
  assert.ok(!ics.includes("PRIVATE PREPARATION"));
  assert.ok(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert.ok(!appointmentCalendar("id", draft, null).includes("VALARM"));
  assert.throws(() => appointmentCalendar("bad\nUID", draft, null));
});

test("health mutation retains the letter link and timezone through parsing", () => {
  const now = new Date().toISOString();
  const mutation = parseHealthMutation({ operation: "ADD_APPOINTMENT", revision: null,
    record: { ...draft, id: "appointment", status: "planned", followUpNotes: "", documentId: "letter", createdAt: now },
    timeline: { id: "timeline", type: "appointment", title: draft.title, date: draft.date, notes: "", createdAt: now } });
  assert.equal(mutation.operation, "ADD_APPOINTMENT");
  if (mutation.operation === "ADD_APPOINTMENT") {
    assert.equal(mutation.record.documentId, "letter");
    assert.equal(mutation.record.timeZone, "Europe/London");
  }
});
