import Link from "next/link";

import type { GardenSectionMeta } from "@/components/garden/garden-section-model";
import { UiIcon } from "@/components/UiIcon";
import type { GardenSection } from "@/lib/garden-sections";

type GardenSectionHeaderProps = {
  accent: { hero: string };
  documentCount: number;
  meta: GardenSectionMeta;
  reminderCount: number;
  reviewCount: number;
  section: GardenSection;
};

export function GardenSectionHeader({
  accent,
  documentCount,
  meta,
  reminderCount,
  reviewCount,
  section
}: GardenSectionHeaderProps) {
  return (
    <header className={`overflow-hidden rounded-[30px] ${accent.hero} p-5 text-white shadow-[0_26px_60px_-38px_rgba(32,53,42,0.75)]`}>
      <div className="flex items-start gap-3">
        <Link href="/room/garden" aria-label="Back to Garden" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">Garden · {meta.eyebrow}</p>
          <h1 className="mt-1 font-serif text-[32px] leading-tight tracking-tight sm:text-4xl">{section.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/78">{meta.description}</p>
        </div>
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-white/12 text-[#edf3e9] sm:flex" aria-hidden="true">
          <UiIcon name={section.icon} className="h-6 w-6" />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[[reminderCount, "Reminders"], [documentCount, "Files"], [reviewCount, "To check"]].map(([value, label]) => (
          <div key={label} className="rounded-[18px] border border-white/10 bg-white/12 px-2 py-3 text-center">
            <p className="font-serif text-2xl leading-none">{value}</p>
            <p className="mt-1 text-[10px] font-semibold text-white/68">{label}</p>
          </div>
        ))}
      </div>
    </header>
  );
}
