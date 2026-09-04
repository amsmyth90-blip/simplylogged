import type { HouseholdSchedulesSnapshot } from "@diarydock/household";

import { familyScheduleDays, familyScheduleTime, sortFamilyRoutines } from "./family-schedule-ui";

export function FamilyScheduleCard({
  loading,
  message,
  onOpen,
  snapshot,
}: {
  loading: boolean;
  message: string | null;
  onOpen: () => void;
  snapshot: HouseholdSchedulesSnapshot | null;
}) {
  const active = sortFamilyRoutines(snapshot?.routines.filter((item) => !item.paused) ?? []);
  return <section className="family-card family-schedule-card">
    <div className="family-section-title"><div><p>Weekly routines</p><h2>Family Schedules</h2></div>
      <span>{active.length}</span></div>
    <p className="family-schedule-intro">
      Keep repeating activities, school runs and household routines together.
    </p>
    {active.slice(0, 3).map((routine) => <button type="button" key={routine.id}
      className="family-schedule-preview" onClick={onOpen}>
      <span className={`family-schedule-dot is-${routine.colour}`} />
      <span><strong>{routine.title}</strong><small>{routine.childName} · {
        familyScheduleDays[routine.day]} · {familyScheduleTime(routine.startTime)}</small></span>
      <b>›</b>
    </button>)}
    {!active.length ? <p className="family-empty">{
      loading ? "Opening the encrypted schedule…" : "No active weekly routines yet."
    }</p> : null}
    <button type="button" className="family-primary family-schedule-open" onClick={onOpen}>
      Open Family Schedules
    </button>
    {message ? <p className="family-schedule-message" role="status">{message}</p> : null}
  </section>;
}
