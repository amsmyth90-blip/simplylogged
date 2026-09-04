import { UiIcon } from "@/components/UiIcon";
import {
  formatScheduleTime,
  scheduleColourStyles,
  scheduleDayNames,
} from "@/components/schedules/kids-schedule-model";
import type { KidScheduleRoutine } from "@/lib/diarydock-data";

export function ScheduleSlotDialog({
  onClose,
  onEdit,
  routines,
}: {
  onClose: () => void;
  onEdit: (routine: KidScheduleRoutine) => void;
  routines: KidScheduleRoutine[] | null;
}) {
  if (!routines) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-slate-950/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/96 p-4 shadow-2xl backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Activities at this time"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">
              {scheduleDayNames[routines[0].day]} at{" "}
              {formatScheduleTime(routines[0].startTime)}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {routines.length} activities
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Close activity list"
          >
            <UiIcon name="plus" className="h-4 w-4 rotate-45" />
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {routines.map((routine) => (
            <button
              key={routine.id}
              type="button"
              onClick={() => onEdit(routine)}
              className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 px-3 py-3 text-left shadow-sm"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${scheduleColourStyles[routine.colour].solid}`}
              >
                {routine.childName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {routine.childName} · {routine.title}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                  {formatScheduleTime(routine.startTime)}–
                  {formatScheduleTime(routine.endTime)}
                  {routine.location ? ` · ${routine.location}` : ""}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-slate-300" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
