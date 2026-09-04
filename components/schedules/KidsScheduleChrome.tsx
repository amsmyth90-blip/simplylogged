import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { PlannerMode } from "@/components/schedules/kids-schedule-model";

export function KidsScheduleChrome({
  editable,
  householdLabel,
  mode,
  onAdd,
  onModeChange,
  onPersonChange,
  people,
  scheduleTitle,
  selectedPerson,
}: {
  editable: boolean;
  householdLabel: string;
  mode: PlannerMode;
  onAdd: () => void;
  onModeChange: (mode: PlannerMode) => void;
  onPersonChange: (person: string) => void;
  people: string[];
  scheduleTitle: string;
  selectedPerson: string;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center gap-3">
        <Link
          href="/family"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl"
          aria-label="Back to Family"
        >
          <UiIcon name="arrow-left" className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href="/family?setup=schedules"
            className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#66805c]"
          >
            {householdLabel} · Change setup
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            {scheduleTitle}
          </h1>
          <p className="truncate text-[9px] text-slate-500">
            Repeating routines · dated events are in the Kitchen
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!editable}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#273d34] text-white shadow-[0_12px_24px_-14px_rgba(30,55,43,0.8)] disabled:opacity-40"
          aria-label="Add weekly activity"
        >
          <UiIcon name="plus" className="h-4 w-4" />
        </button>
      </header>
      <div className="mt-3 flex shrink-0 items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Show schedules for</span>
          <select
            value={selectedPerson}
            onChange={(event) => onPersonChange(event.target.value)}
            className="h-8 w-full appearance-none rounded-full border border-white/90 bg-white/75 px-3 pr-8 text-[11px] font-semibold text-slate-600 shadow-sm outline-none"
          >
            <option value="All">Everyone</option>
            {people.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
          <UiIcon
            name="chevron-down"
            className="pointer-events-none absolute right-3 top-2 h-3.5 w-3.5 text-slate-400"
          />
        </label>
        <div className="flex rounded-full border border-white/90 bg-white/70 p-1 shadow-sm">
          <ModeButton
            active={mode === "week"}
            onClick={() => onModeChange("week")}
          >
            Week
          </ModeButton>
          <ModeButton
            active={mode === "editor"}
            disabled={!editable}
            onClick={onAdd}
          >
            Add/Edit
          </ModeButton>
        </div>
      </div>
    </>
  );
}

function ModeButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1 text-[10px] font-bold ${active ? "bg-[#e2eadc] text-[#536b49]" : "text-slate-400"}`}
    >
      {children}
    </button>
  );
}
