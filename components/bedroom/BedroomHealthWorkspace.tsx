"use client";

import { BottomNav } from "@/components/BottomNav";

import {
  AddHealthModal,
  EmergencyProfile,
  SecondaryHealthSections,
} from "./health-home/HealthHomeExtras";
import { HealthHomeHeader } from "./health-home/HealthHomeHeader";
import {
  HealthAtGlance,
  PrimaryHealthSections,
  ReviewAndProfile,
} from "./health-home/HealthHomeOverview";
import { HealthRecordPanels } from "./health-home/HealthHomePanels";
import { useBedroomHealth } from "./health-home/useBedroomHealth";

export { genuineHealthDocuments } from "./health-home/health-home-model";

export function BedroomHealthWorkspace() {
  const view = useBedroomHealth();

  if (!view.hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-4">
        <div className="mx-auto max-w-[1080px] space-y-4 animate-pulse">
          <div className="h-48 rounded-[28px] bg-white/70" />
          <div className="h-36 rounded-[24px] bg-white/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 rounded-[22px] bg-white/70" />
            <div className="h-24 rounded-[22px] bg-white/70" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-24 top-[38rem] h-72 w-72 rounded-full bg-[#eadde6]/40 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[1080px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <HealthHomeHeader view={view} />
        <HealthAtGlance view={view} />
        <ReviewAndProfile view={view} />
        <PrimaryHealthSections view={view} />
        <HealthRecordPanels view={view} />
        <EmergencyProfile view={view} />
        <SecondaryHealthSections view={view} />
        <p className="mt-7 rounded-2xl border border-[#20352a]/[0.07] bg-white/70 p-4 text-[11px] leading-5 text-[#667068]">
          DiaryDock helps you organise health information and documents. It does
          not provide medical advice, diagnosis or emergency care.
        </p>
      </div>
      <AddHealthModal view={view} />
      <BottomNav />
    </main>
  );
}
