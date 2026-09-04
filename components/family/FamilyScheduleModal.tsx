import Link from "next/link";

import {
  familyWeekDayNames,
  householdStyleOptions,
  type HouseholdStyle,
  type HouseholdStyleOption
} from "@/components/family/family-workspace-model";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { KidScheduleRoutine } from "@/lib/diarydock-data";

type FamilyScheduleModalProps = {
  activeStyle: HouseholdStyleOption;
  householdStyle: HouseholdStyle;
  householdStyleSet: boolean;
  onClose: () => void;
  onSelectStyle: (style: HouseholdStyle) => void;
  open: boolean;
  routines: KidScheduleRoutine[];
};

export function FamilyScheduleModal({
  activeStyle,
  householdStyle,
  householdStyleSet,
  onClose,
  onSelectStyle,
  open,
  routines
}: FamilyScheduleModalProps) {
  return (
    <ModalShell
      open={open}
      title={householdStyleSet ? activeStyle.scheduleLabel : "Set up schedules"}
      subtitle="Repeating weekly routines live here. Dated events stay on the Kitchen wall calendar."
      onClose={onClose}
      footer={
        householdStyleSet ? (
          <Link href="/family/schedules" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white shadow-sm">
            <UiIcon name="calendar" className="h-4 w-4" />
            Open {activeStyle.scheduleLabel.toLowerCase()}
          </Link>
        ) : (
          <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f]/45 px-4 py-3 text-sm font-semibold text-white">
            Choose your household above
          </button>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {householdStyleOptions.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold transition ${style.id === householdStyle ? "border-[#788c6c] bg-[#e3eadc] text-[#41533b]" : "border-black/8 bg-white/70 text-ink/55"}`}
            >
              {style.shortLabel}
            </button>
          ))}
        </div>
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-xs leading-5 text-ink/60">{activeStyle.description}</p>
        <div className="grid gap-2">
          {activeStyle.features.map((feature) => (
            <Link key={feature.label} href={feature.href} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 px-3 py-2.5 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e2eadc] text-[#5d7353]"><UiIcon name={feature.icon} className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{feature.label}</span>
                <span className="block truncate text-[11px] text-ink/45">{feature.detail}</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-ink/30" />
            </Link>
          ))}
        </div>
        {routines.length ? (
          <div className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/75 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">Weekly routines</p>
            <div className="mt-2 space-y-1.5">
              {routines.map((routine) => (
                <div key={routine.id} className="flex items-center gap-2 text-xs text-ink/65">
                  <span className="min-w-0 flex-1 truncate font-semibold">{routine.title}</span>
                  <span className="text-[#607455]">{familyWeekDayNames[routine.day]}</span>
                  <span className="text-ink/40">{routine.startTime}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 px-4 py-3 text-center text-xs text-ink/50">
            {householdStyle === "children" ? "No weekly routines yet. Add the first family schedule." : "No weekly routines yet. Add the first household schedule."}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
