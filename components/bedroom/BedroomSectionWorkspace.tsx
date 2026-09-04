"use client";

import Link from "next/link";

import { BottomNav } from "@/components/BottomNav";
import { BedroomRecordModal } from "@/components/bedroom/section/BedroomRecordModal";
import { BedroomSectionContent } from "@/components/bedroom/section/BedroomSectionContent";
import { useBedroomSection } from "@/components/bedroom/section/useBedroomSection";
import { UiIcon } from "@/components/UiIcon";
import type { BedroomSectionId } from "@/lib/health-records";

export function BedroomSectionWorkspace({
  section,
  initiallyAdding = false,
}: {
  section: BedroomSectionId;
  initiallyAdding?: boolean;
}) {
  const bedroom = useBedroomSection(section, initiallyAdding);
  if (!bedroom.hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-4">
        <div className="mx-auto max-w-[760px] animate-pulse space-y-4">
          <div className="h-36 rounded-[28px] bg-white/70" />
          <div className="h-72 rounded-[24px] bg-white/70" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="mx-auto max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="rounded-[28px] border border-white/80 bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-42px_rgba(32,53,42,0.6)]">
          <div className="flex items-start gap-3">
            <Link
              href="/bedroom"
              aria-label="Back to My Health"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white"
            >
              <UiIcon name="arrow-left" className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
                Bedroom · My Health
              </p>
              <h1 className="mt-1 font-serif text-[28px] leading-tight sm:text-4xl">
                {bedroom.meta.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#667068]">
                {bedroom.meta.description}
              </p>
            </div>
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a] sm:flex">
              <UiIcon name={bedroom.meta.icon} className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#eef2e9] px-3 py-2 text-[11px] text-[#48604e]">
            <UiIcon name="lock" className="h-4 w-4" />
            <span>
              Private health information. Sharing is never implied by linking a
              profile or contact.
            </span>
          </div>
        </header>
        {bedroom.message ? (
          <p
            role="status"
            className="mt-4 rounded-2xl bg-[#e8eee3] px-4 py-3 text-xs text-[#48604e]"
          >
            {bedroom.message}
          </p>
        ) : null}
        <div className="mt-5">
          <BedroomSectionContent bedroom={bedroom} />
        </div>
        <p className="mt-5 rounded-2xl border border-[#20352a]/[0.07] bg-white/70 p-4 text-[11px] leading-5 text-[#667068]">
          DiaryDock organises information you provide. It does not diagnose
          conditions, verify medical accuracy, provide medical advice or replace
          emergency services.
        </p>
      </div>
      <BedroomRecordModal bedroom={bedroom} />
      <BottomNav />
    </main>
  );
}
