import type { AppointmentDraft } from "../../lib/appointments/model.ts";

export function AppointmentFields({ draft, onChange }: {
  draft: AppointmentDraft; onChange: (draft: AppointmentDraft) => void;
}) {
  const change = (key: keyof AppointmentDraft, value: string | number) => onChange({ ...draft, [key]: value });
  return <>
    {([['title', 'Appointment title', 200], ['provider', 'Provider or clinic', 200],
      ['location', 'Location', 300]] as const).map(([key, label, limit]) => <label key={key}>
      <span>{label}</span><input required={key === "title"} value={draft[key]} maxLength={limit}
        onChange={(event) => change(key, event.target.value)} />
    </label>)}
    <div className="appointment-fields-row">
      <label><span>Date</span><input required type="date" value={draft.date} onChange={(e) => change("date", e.target.value)} /></label>
      <label><span>Time</span><input required type="time" value={draft.time} onChange={(e) => change("time", e.target.value)} /></label>
    </div>
    <label><span>Time zone</span><input required value={draft.timeZone} maxLength={64}
      onChange={(e) => change("timeZone", e.target.value)} list="appointment-time-zones" /></label>
    <datalist id="appointment-time-zones"><option value="Europe/London" /><option value="Europe/Dublin" /><option value="UTC" /></datalist>
    <label><span>Calendar duration (minutes)</span><input required type="number" min={5} max={1440}
      value={draft.durationMinutes} onChange={(e) => change("durationMinutes", Number(e.target.value))} /></label>
    <p className="appointment-hint">30 minutes is a suggested calendar slot. Check how long your visit may take.</p>
    <label><span>Preparation instructions from the letter</span><textarea rows={3} maxLength={4000}
      value={draft.preparationNotes} onChange={(e) => change("preparationNotes", e.target.value)} /></label>
  </>;
}
