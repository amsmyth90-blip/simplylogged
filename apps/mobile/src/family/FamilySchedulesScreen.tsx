import { useMemo, useState } from "react";

import type { HouseholdScheduleRoutine } from "@diarydock/household";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { FamilyScheduleEditor } from "./FamilyScheduleEditor";
import {
  familyScheduleDays,
  familyScheduleTime,
  sortFamilyRoutines,
} from "./family-schedule-ui";
import type { useFamilySchedules } from "./use-family-schedules";

type ScheduleModel = ReturnType<typeof useFamilySchedules>;
const emptyRoutines: HouseholdScheduleRoutine[] = [];

export function FamilySchedulesScreen({
  directoryPeople,
  model,
  onBack,
  onNavigate,
}: {
  directoryPeople: string[];
  model: ScheduleModel;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
}) {
  const today = (new Date().getDay() + 6) % 7;
  const [day, setDay] = useState(today);
  const [person, setPerson] = useState("All");
  const [editing, setEditing] = useState<HouseholdScheduleRoutine | null | undefined>();
  const routines = model.snapshot?.routines ?? emptyRoutines;
  const people = useMemo(() => Array.from(new Set([
    ...directoryPeople,
    ...(model.snapshot?.people ?? []),
    ...routines.map((item) => item.childName),
  ].map((item) => item.trim()).filter(Boolean))), [directoryPeople, model.snapshot, routines]);
  const visible = sortFamilyRoutines(routines.filter((item) =>
    item.day === day && (person === "All" || item.childName === person)));

  async function save(routine: Omit<HouseholdScheduleRoutine, "id">) {
    return model.mutate({
      operation: "SAVE_ROUTINE",
      routineId: editing?.id ?? null,
      routine,
    });
  }

  async function remove(routine: HouseholdScheduleRoutine) {
    if (!window.confirm(`Delete ${routine.title}?`)) return false;
    return model.mutate({ operation: "DELETE_ROUTINE", routineId: routine.id });
  }

  return <main className="family-schedule-screen">
    <header className="family-schedule-header">
      <button type="button" onClick={onBack} aria-label="Back to Family Room">‹</button>
      <div><p>Family Room</p><h1>Family Schedules</h1>
        <span>Repeating routines and weekly plans.</span></div>
      <button type="button" className="family-schedule-add"
        disabled={!model.online || !model.snapshot}
        onClick={() => setEditing(null)}>＋ Add</button>
    </header>
    <section className="family-schedule-toolbar">
      <label>Show schedules for<select aria-label="Show schedules for" value={person}
        onChange={(event) => setPerson(event.target.value)}>
        <option>All</option>{people.map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <span className={model.online ? "is-online" : "is-offline"}>{
        model.online ? "Ready to update" : "Encrypted offline copy"}</span>
    </section>
    <nav className="family-schedule-days" aria-label="Schedule day">
      {familyScheduleDays.map((label, index) => <button key={label} type="button"
        className={day === index ? "active" : ""} onClick={() => setDay(index)}>
        <span>{label.slice(0, 1)}</span><small>{label.slice(0, 3)}</small></button>)}
    </nav>
    <section className="family-schedule-list">
      <div className="family-schedule-list-title"><div><p>{familyScheduleDays[day]}</p>
        <h2>{person === "All" ? "Everyone" : person}</h2></div><span>{visible.length}</span></div>
      {model.loading && !model.snapshot
        ? <p className="family-schedule-empty">Opening the encrypted weekly plan…</p>
        : visible.length ? visible.map((routine) => <button type="button" key={routine.id}
          className={`family-schedule-row is-${routine.colour}${routine.paused ? " is-paused" : ""}`}
          onClick={() => setEditing(routine)}>
          <time>{familyScheduleTime(routine.startTime)}<small>to {
            familyScheduleTime(routine.endTime)}</small></time>
          <span><strong>{routine.title}</strong><small>{routine.childName}{
            routine.location ? ` · ${routine.location}` : ""}</small><small>{
            routine.responsibleAdult ? `With ${routine.responsibleAdult}` : routine.repeat === "term-time"
              ? "Term time" : "Weekly"}</small></span>
          <b>{routine.paused ? "Paused" : "›"}</b>
        </button>) : <div className="family-schedule-empty"><strong>No routines for this day</strong>
          <span>Add a repeating activity or choose another day.</span></div>}
    </section>
    {model.message ? <p className="family-schedule-status" role="status">{model.message}</p> : null}
    {editing !== undefined ? <FamilyScheduleEditor busy={model.busy} people={people}
      routine={editing} onCancel={() => setEditing(undefined)} onDelete={remove} onSave={save} /> : null}
    <MobileBottomNav active="FAMILY" onNavigate={onNavigate} />
  </main>;
}
