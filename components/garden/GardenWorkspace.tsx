"use client";

import { GardenAddModal } from "./workspace/GardenAddModal";
import { GardenHeader } from "./workspace/GardenHeader";
import { GardenOverview } from "./workspace/GardenOverview";
import { GardenPreviews, GardenSectionLinks } from "./workspace/GardenSections";
import { useGardenWorkspace } from "./workspace/useGardenWorkspace";

export function GardenWorkspace() {
  const view = useGardenWorkspace();

  if (!view.hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f2ea] px-4 pb-32 pt-4">
        <div className="mx-auto max-w-[760px] animate-pulse space-y-4">
          <div className="h-[520px] rounded-[30px] bg-[#dfe6d8]" />
          <div className="h-48 rounded-[24px] bg-white/70" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="mx-auto max-w-[760px] px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <GardenHeader view={view} />
        <GardenOverview view={view} />
        <GardenSectionLinks />
        <GardenPreviews view={view} />
        <p className="mt-5 rounded-[18px] border border-[#20352a]/[0.07] bg-[#eef2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
          DiaryDock organises information you provide. It does not determine
          legal boundary ownership, certify outdoor safety or replace
          veterinary, legal or qualified professional advice.
        </p>
      </div>
      <GardenAddModal view={view} />
    </main>
  );
}
