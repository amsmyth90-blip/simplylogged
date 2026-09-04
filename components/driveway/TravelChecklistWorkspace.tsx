"use client";

import { BottomNav } from "@/components/BottomNav";
import { TravelChecklistAddModal } from "@/components/driveway/travel-checklist/TravelChecklistAddModal";
import { TravelChecklistCategoryView } from "@/components/driveway/travel-checklist/TravelChecklistCategoryView";
import { TravelChecklistHeader } from "@/components/driveway/travel-checklist/TravelChecklistHeader";
import { TravelChecklistOverview } from "@/components/driveway/travel-checklist/TravelChecklistOverview";
import { TravelChecklistReview } from "@/components/driveway/travel-checklist/TravelChecklistReview";
import { TravelChecklistSuggestions } from "@/components/driveway/travel-checklist/TravelChecklistSuggestions";
import { useTravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";

export function TravelChecklistWorkspace({
  initialTripId,
  backHref = "/room/driveway",
}: {
  initialTripId?: string;
  backHref?: string;
} = {}) {
  const controller = useTravelChecklistController(initialTripId);
  return (
    <main className="min-h-screen bg-[#f8f3e8] pb-32 text-[#173c2b]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <TravelChecklistHeader controller={controller} backHref={backHref} />
        {controller.stage === "overview" ? <TravelChecklistOverview controller={controller} /> : null}
        {controller.stage === "checklist" ? <TravelChecklistCategoryView controller={controller} /> : null}
        {controller.stage === "suggestions" ? <TravelChecklistSuggestions controller={controller} /> : null}
        {controller.stage === "review" ? <TravelChecklistReview controller={controller} /> : null}
        <div className="mt-5 rounded-[20px] border border-[#d8dfd2] bg-[#eef2e9]/78 px-4 py-3 text-[11px] leading-5 text-[#4f6256]"><span className="font-semibold">Privacy note:</span> use the checklist to confirm that documents are packed. Passport numbers and original identity records remain in the Office or secure All Files storage.</div>
      </div>
      <TravelChecklistAddModal controller={controller} />
      <BottomNav />
    </main>
  );
}
