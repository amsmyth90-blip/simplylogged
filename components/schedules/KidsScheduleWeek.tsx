import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import {
  formatScheduleTime,
  groupRoutinesBySlot,
  scheduleActivityPosition,
  scheduleColourStyles,
  scheduleDayNames,
  scheduleTimeLabels,
} from "@/components/schedules/kids-schedule-model";
import type { KidScheduleRoutine } from "@/lib/diarydock-data";

export function KidsScheduleWeek({
  editable,
  onAdd,
  onEdit,
  onOpenSlot,
  routines,
}: {
  editable: boolean;
  onAdd: () => void;
  onEdit: (routine: KidScheduleRoutine) => void;
  onOpenSlot: (routines: KidScheduleRoutine[]) => void;
  routines: KidScheduleRoutine[];
}) {
  return (
    <main className="mt-3 flex min-h-0 flex-1 flex-col">
      <section className="relative min-h-0 flex-1 overflow-hidden rounded-[27px] border border-white/90 bg-white/78 p-3 shadow-[0_24px_60px_-34px_rgba(41,59,45,0.48)] backdrop-blur-xl">
        <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-1">
          <span />
          {scheduleDayNames.map((day, index) => (
            <div key={day} className="text-center">
              <p className="text-[8px] font-bold uppercase text-slate-400">
                {day}
              </p>
              <span
                className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${index === (new Date().getDay() + 6) % 7 ? "bg-[#789469]" : "bg-slate-200"}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 grid h-[calc(100%-38px)] grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-1">
          <div className="relative">
            {scheduleTimeLabels.map((time, index) => (
              <span
                key={time}
                className="absolute right-1 -translate-y-1/2 text-[7px] font-medium text-slate-400"
                style={{
                  top: `${(index / (scheduleTimeLabels.length - 1)) * 91 + 3}%`,
                }}
              >
                {time}
              </span>
            ))}
          </div>
          {scheduleDayNames.map((day, dayIndex) => (
            <div
              key={day}
              className="relative rounded-xl border border-slate-100 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(18.18%-1px),rgba(148,163,184,0.16)_18.18%)]"
            >
              {groupRoutinesBySlot(
                routines.filter((routine) => routine.day === dayIndex),
              ).map((slot) => {
                const split = slot.routines.length > 1;
                return (
                  <div
                    key={slot.key}
                    className="group/slot absolute inset-x-0 z-10"
                    style={scheduleActivityPosition(slot.routines[0])}
                  >
                    {slot.routines.slice(0, 2).map((routine, index) => (
                      <button
                        key={routine.id}
                        type="button"
                        onClick={() => onEdit(routine)}
                        title={`${routine.childName}: ${routine.title}, ${formatScheduleTime(routine.startTime)}`}
                        className={`absolute inset-y-0 overflow-hidden rounded-[8px] border px-0.5 py-1 text-center shadow-sm transition hover:z-20 hover:scale-[1.03] ${scheduleColourStyles[routine.colour].card} ${routine.paused ? "opacity-45 grayscale" : ""}`}
                        style={
                          split
                            ? index === 0
                              ? { left: "1px", width: "calc(50% - 2px)" }
                              : { right: "1px", width: "calc(50% - 2px)" }
                            : { left: "2px", right: "2px" }
                        }
                        aria-label={`Edit ${routine.title} for ${routine.childName}`}
                      >
                        {split ? (
                          <>
                            <span className="mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/70 text-[6px] font-bold">
                              {routine.childName.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="mt-0.5 block overflow-hidden text-[5px] font-bold leading-none">
                              {routine.title}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="block overflow-hidden text-[6px] font-bold leading-[1.05]">
                              {routine.title}
                            </span>
                            <span className="mt-0.5 block overflow-hidden text-[6px] leading-tight opacity-70">
                              {formatScheduleTime(routine.startTime)}
                            </span>
                          </>
                        )}
                      </button>
                    ))}
                    {slot.routines.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => onOpenSlot(slot.routines)}
                        className="absolute -right-1 -top-1 z-30 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#2f4339] px-1 text-[7px] font-bold text-white shadow-md"
                        aria-label={`Show ${slot.routines.length} activities at ${formatScheduleTime(slot.routines[0].startTime)}`}
                      >
                        +{slot.routines.length - 2}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {!routines.length ? (
          <div className="pointer-events-none absolute inset-x-10 top-1/2 z-20 -translate-y-1/2 rounded-3xl border border-dashed border-[#b9c8b0] bg-[#f4f7f1]/92 px-5 py-5 text-center shadow-sm backdrop-blur-xl">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dfe9d8] text-[#647b59]">
              <UiIcon name="calendar" className="h-5 w-5" />
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Build your household week
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Add work, appointments, exercise, clubs, pickups and more.
            </p>
          </div>
        ) : null}
      </section>
      <div className="mt-3 flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={!editable}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#769267] text-sm font-semibold text-white shadow-[0_14px_26px_-16px_rgba(65,92,56,0.75)] disabled:opacity-45"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add weekly activity
        </button>
        <Link
          href="/kitchen/calendar"
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/90 bg-white/75 px-3 text-[10px] font-semibold text-slate-600 shadow-sm"
          aria-label="Open the Kitchen wall calendar"
        >
          <UiIcon name="calendar" className="h-4 w-4" />
          Kitchen calendar
        </Link>
      </div>
    </main>
  );
}
