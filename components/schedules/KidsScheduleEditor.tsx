import type { Dispatch, SetStateAction } from "react";

import { UiIcon } from "@/components/UiIcon";
import {
  KidsScheduleDraftInput as DraftInput,
  kidsScheduleFieldClass as fieldClass,
} from "@/components/schedules/KidsScheduleDraftInput";
import {
  formatScheduleTime,
  scheduleColours,
  scheduleColourStyles,
  scheduleDayNames,
  type RoutineDraft,
} from "@/components/schedules/kids-schedule-model";
import type { KidScheduleRoutine } from "@/lib/diarydock-data";

export function KidsScheduleEditor({
  draft,
  editingId,
  message,
  onClose,
  onDelete,
  onEdit,
  onSave,
  onTogglePause,
  people,
  routines,
  setDraft,
}: {
  draft: RoutineDraft;
  editingId: string | null;
  message: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (routine: KidScheduleRoutine) => void;
  onSave: () => void;
  onTogglePause: (id: string) => void;
  people: string[];
  routines: KidScheduleRoutine[];
  setDraft: Dispatch<SetStateAction<RoutineDraft>>;
}) {
  return (
    <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
      <section className="shrink-0 rounded-[27px] border border-white/90 bg-white/80 p-4 shadow-[0_22px_55px_-34px_rgba(41,59,45,0.48)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#718a65]">
              {editingId ? "Edit routine" : "Create activity"}
            </p>
            <h2 className="mt-0.5 text-base font-semibold">
              {editingId
                ? draft.title || "Weekly activity"
                : "New weekly activity"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Close editor"
          >
            <UiIcon name="plus" className="h-3.5 w-3.5 rotate-45" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DraftInput
            label="Activity"
            value={draft.title}
            placeholder="Swimming"
            onChange={(title) => setDraft((current) => ({ ...current, title }))}
          />
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase text-slate-400">
              Person
            </span>
            <input
              list="household-schedule-people"
              value={draft.childName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  childName: event.target.value,
                }))
              }
              placeholder="Name"
              className={fieldClass}
            />
            <datalist id="household-schedule-people">
              {people.map((person) => (
                <option key={person} value={person} />
              ))}
            </datalist>
          </label>
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase text-slate-400">
              Day
            </span>
            <select
              value={draft.day}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  day: Number(event.target.value),
                }))
              }
              className={fieldClass}
            >
              {scheduleDayNames.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <DraftInput
              label="Start"
              type="time"
              value={draft.startTime}
              onChange={(startTime) =>
                setDraft((current) => ({ ...current, startTime }))
              }
            />
            <DraftInput
              label="Finish"
              type="time"
              value={draft.endTime}
              onChange={(endTime) =>
                setDraft((current) => ({ ...current, endTime }))
              }
            />
          </div>
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase text-slate-400">
              Repeat
            </span>
            <select
              value={draft.repeat}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  repeat: event.target.value as KidScheduleRoutine["repeat"],
                }))
              }
              className={fieldClass}
            >
              <option value="weekly">Every week</option>
              <option value="term-time">Term time</option>
            </select>
          </label>
          <DraftInput
            label="Location"
            value={draft.location}
            placeholder="Oakfield Pool"
            onChange={(location) =>
              setDraft((current) => ({ ...current, location }))
            }
          />
          <DraftInput
            label="Who handles it?"
            value={draft.responsibleAdult}
            placeholder="Self, parent, carer..."
            onChange={(responsibleAdult) =>
              setDraft((current) => ({ ...current, responsibleAdult }))
            }
          />
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase text-slate-400">
              Transport
            </span>
            <select
              value={draft.transport}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  transport: event.target.value,
                }))
              }
              className={fieldClass}
            >
              {["Car", "Walk", "Bus", "Bike", "Other"].map((transport) => (
                <option key={transport}>{transport}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-1">
            {scheduleColours.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, colour }))}
                aria-label={`Use ${colour}`}
                className={`h-7 w-7 rounded-full border-2 border-white shadow-sm ${scheduleColourStyles[colour].solid} ${draft.colour === colour ? "ring-2 ring-[#4d6246]" : ""}`}
              />
            ))}
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={() => onTogglePause(editingId)}
              className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600"
            >
              {draft.paused ? "Resume" : "Pause"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            className="ml-auto rounded-xl bg-[#769267] px-5 py-2 text-xs font-semibold text-white"
          >
            Save
          </button>
        </div>
        {message ? (
          <p className="mt-2 text-[10px] font-semibold text-red-600">
            {message}
          </p>
        ) : null}
      </section>
      <section className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/90 bg-white/70 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700">
            Saved routines
          </h2>
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {routines.length} total
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {routines.slice(0, 3).map((routine) => (
            <button
              key={routine.id}
              type="button"
              onClick={() => onEdit(routine)}
              className="flex w-full items-center gap-2 rounded-xl bg-white/85 px-2.5 py-2 text-left"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${scheduleColourStyles[routine.colour].dot}`}
              />
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
                {routine.title}
              </span>
              <span className="text-[9px] text-slate-400">
                {scheduleDayNames[routine.day]} ·{" "}
                {formatScheduleTime(routine.startTime)}
              </span>
              {routine.paused ? (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">
                  Paused
                </span>
              ) : null}
            </button>
          ))}
          {!routines.length ? (
            <p className="py-4 text-center text-[11px] text-slate-400">
              Your saved weekly activities will appear here.
            </p>
          ) : null}
        </div>
        {editingId ? (
          <button
            type="button"
            onClick={() => onDelete(editingId)}
            className="mt-2 text-[10px] font-semibold text-red-500"
          >
            Delete this routine
          </button>
        ) : null}
      </section>
    </main>
  );
}
