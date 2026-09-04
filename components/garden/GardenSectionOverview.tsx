import Link from "next/link";

import type { GardenSectionMeta } from "@/components/garden/garden-section-model";
import { GardenCard } from "@/components/garden/GardenSectionLists";
import { UiIcon } from "@/components/UiIcon";
import type { GardenSection } from "@/lib/garden-sections";

type GardenSectionOverviewProps = {
  accent: { icon: string; tint: string };
  meta: GardenSectionMeta;
  onAdd: () => void;
  section: GardenSection;
};

export function GardenSectionOverview({ accent, meta, onAdd, section }: GardenSectionOverviewProps) {
  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onAdd} className="flex min-h-[76px] items-center gap-3 rounded-[20px] bg-[#315443] p-3 text-left text-white transition hover:bg-[#3d624f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white/14 text-[#e8eee3]"><UiIcon name="calendar" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{meta.primaryAction}</span><span className="mt-1 block text-[11px] leading-4 text-white/70">Create a Garden reminder using the existing DiaryDock reminders.</span></span>
          <UiIcon name="plus" className="h-4 w-4 shrink-0 text-white/70" />
        </button>
        <Link href={`/capture?room=garden&section=${section.id}`} className="group flex min-h-[70px] items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3 text-[#20352a] transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-[#52705a]"><UiIcon name="camera" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Upload a Garden file</span><span className="mt-1 block text-[11px] leading-4 text-[#667068]">Scan or upload a related record into All Files.</span></span>
          <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#8a938b] transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      <GardenCard className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">What belongs here</p><h2 className="mt-1 font-serif text-2xl">{meta.title}</h2></div>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${accent.icon}`} aria-hidden="true"><UiIcon name={section.icon} className="h-5 w-5" /></span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {meta.guidance.map((item) => <span key={item} className={`rounded-full px-3 py-2 text-[11px] font-semibold text-[#52705a] ${accent.tint}`}>{item}</span>)}
        </div>
      </GardenCard>
    </>
  );
}

export function GardenSectionFooter({ notice }: { notice?: string }) {
  return (
    <>
      <GardenCard className="mt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a]" aria-hidden="true"><UiIcon name="check" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h2 className="font-serif text-xl">Keeps Garden clear</h2><p className="mt-1 text-xs leading-5 text-[#667068]">Formal household paperwork still belongs in Office, vehicles stay in Garage, and family schedules stay in Family Room or Kitchen. This section is just for outdoor-life admin.</p></div>
        </div>
      </GardenCard>
      {notice ? <p className="mt-5 rounded-[18px] border border-[#20352a]/[0.07] bg-[#eef2e9]/85 px-4 py-3.5 text-[11px] leading-5 text-[#667068]">{notice}</p> : null}
    </>
  );
}
