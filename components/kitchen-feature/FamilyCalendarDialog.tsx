import { UiIcon } from "@/components/UiIcon";

import {
  calendarCategories,
  type CalendarCategory,
  type HouseholdEvent,
} from "./kitchen-feature-model";

export function FamilyCalendarDialog({
  category,
  selectedDate,
  events,
  newEvent,
  newEventTime,
  onClose,
  onNewEventChange,
  onNewEventTimeChange,
  onAdd,
  onRemove,
}: {
  category: CalendarCategory;
  selectedDate: Date;
  events: HouseholdEvent[];
  newEvent: string;
  newEventTime: string;
  onClose: () => void;
  onNewEventChange: (value: string) => void;
  onNewEventTimeChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (eventId: string) => void;
}) {
  const label = calendarCategories.find((item) => item.id === category)?.label;
  return (
    <div
      className="absolute inset-0 z-[60] flex items-end bg-slate-950/20 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/95 p-4 shadow-2xl backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`${label} plans`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">
              {selectedDate.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500"
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {events.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-2xl bg-[#edf4e9] px-3 py-2.5"
            >
              <span className="text-xs font-bold text-[#607a56]">
                {event.time}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {event.title}
              </span>
              <button
                type="button"
                onClick={() => onRemove(event.id)}
                className="text-xs text-slate-400"
                aria-label={`Remove ${event.title}`}
              >
                x
              </button>
            </div>
          ))}
          {!events.length ? (
            <p className="rounded-2xl bg-[#f0f4ed] px-3 py-3 text-center text-xs text-slate-500">
              Nothing planned yet.
            </p>
          ) : null}
          {events.length > 3 ? (
            <p className="text-center text-[10px] font-semibold text-slate-400">
              +{events.length - 3} more plans
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="time"
            value={newEventTime}
            onChange={(event) => onNewEventTimeChange(event.target.value)}
            className="w-[88px] rounded-2xl border border-slate-200 bg-white px-2 text-xs outline-none"
            aria-label="Event time"
          />
          <input
            value={newEvent}
            onChange={(event) => onNewEventChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAdd();
            }}
            placeholder="Add a plan"
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={onAdd}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#263b35] text-white"
            aria-label="Add plan"
          >
            <UiIcon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
