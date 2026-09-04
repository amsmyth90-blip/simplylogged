import { useEffect, useState } from "react";

import {
  householdScheduleColours,
  type HouseholdScheduleRoutine,
  type SaveHouseholdScheduleRoutine,
} from "@diarydock/household";

import {
  emptyFamilyRoutine,
  familyScheduleDays,
  scheduleMinutes,
} from "./family-schedule-ui";

export function FamilyScheduleEditor({
  busy,
  people,
  routine,
  onCancel,
  onDelete,
  onSave,
}: {
  busy: boolean;
  people: string[];
  routine: HouseholdScheduleRoutine | null;
  onCancel: () => void;
  onDelete: (routine: HouseholdScheduleRoutine) => Promise<boolean>;
  onSave: (routine: SaveHouseholdScheduleRoutine) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<SaveHouseholdScheduleRoutine>(() => {
    if (!routine) return { ...emptyFamilyRoutine, childName: people[0] ?? "" };
    const { id: _id, ...saved } = routine;
    void _id;
    return saved;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  function update<K extends keyof SaveHouseholdScheduleRoutine>(
    key: K,
    value: SaveHouseholdScheduleRoutine[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (scheduleMinutes(draft.endTime) <= scheduleMinutes(draft.startTime)) {
      setError("The finish time needs to be after the start time.");
      return;
    }
    setError(null);
    if (await onSave(draft)) onCancel();
  }

  return <div className="family-schedule-editor-backdrop" role="presentation">
    <form className="family-schedule-editor" aria-label={routine ? "Edit routine" : "Add routine"}
      onSubmit={(event) => void submit(event)}>
      <header><div><p>Weekly routine</p><h2>{routine ? draft.title : "Add an activity"}</h2></div>
        <button type="button" onClick={onCancel} aria-label="Close schedule editor">×</button></header>
      <div className="family-schedule-fields">
        <label className="family-schedule-wide">Activity
          <input autoFocus required maxLength={160} value={draft.title}
            onChange={(event) => update("title", event.target.value)} /></label>
        <label>Who it is for<input required list="family-schedule-people" maxLength={120}
          value={draft.childName} onChange={(event) => update("childName", event.target.value)} /></label>
        <datalist id="family-schedule-people">{people.map((person) =>
          <option key={person} value={person} />)}</datalist>
        <label>Day<select value={draft.day}
          onChange={(event) => update("day", Number(event.target.value))}>{familyScheduleDays.map(
            (day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label>Starts<input required type="time" value={draft.startTime}
          onChange={(event) => update("startTime", event.target.value)} /></label>
        <label>Finishes<input required type="time" value={draft.endTime}
          onChange={(event) => update("endTime", event.target.value)} /></label>
        <label>Repeats<select value={draft.repeat}
          onChange={(event) => update("repeat", event.target.value as typeof draft.repeat)}>
          <option value="weekly">Every week</option><option value="term-time">Term time</option>
        </select></label>
        <label>Colour<select value={draft.colour}
          onChange={(event) => update("colour", event.target.value as typeof draft.colour)}>
          {householdScheduleColours.map((colour) => <option key={colour} value={colour}>{
            colour[0]!.toUpperCase() + colour.slice(1)}</option>)}</select></label>
        <label className="family-schedule-wide">Location<input maxLength={240} value={draft.location}
          onChange={(event) => update("location", event.target.value)} /></label>
        <label>Responsible adult<input maxLength={120} value={draft.responsibleAdult}
          onChange={(event) => update("responsibleAdult", event.target.value)} /></label>
        <label>Transport<input maxLength={80} value={draft.transport}
          onChange={(event) => update("transport", event.target.value)} /></label>
        <label className="family-schedule-check family-schedule-wide">
          <input type="checkbox" checked={draft.paused}
            onChange={(event) => update("paused", event.target.checked)} />Pause this routine</label>
      </div>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      <footer>
        {routine ? <button type="button" className="family-schedule-delete" disabled={busy}
          onClick={() => void onDelete(routine).then((deleted) => { if (deleted) onCancel(); })}>
          Delete routine</button> : <span />}
        <button type="submit" className="family-primary" disabled={busy}>{
          busy ? "Saving…" : "Save routine"}</button>
      </footer>
    </form>
  </div>;
}
