"use client";

import { BottomNav } from "@/components/BottomNav";

import { CreateTripWizard } from "./trips/CreateTripWizard";
import { TripsFilters } from "./trips/TripsFilters";
import { TripsHeader } from "./trips/TripsHeader";
import { TripsList } from "./trips/TripsList";
import { useTripsDirectory } from "./trips/useTripsDirectory";

export function TripsWorkspace({ createOnLoad = false }: { createOnLoad?: boolean }) {
  const controller = useTripsDirectory(createOnLoad);
  if (!controller.hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f1e8] px-4 py-8">
        <div className="mx-auto max-w-[900px] animate-pulse space-y-4">
          <div className="h-16 rounded-3xl bg-white/70" />
          <div className="h-52 rounded-[28px] bg-white/70" />
          <div className="h-36 rounded-[28px] bg-white/70" />
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-32 text-[#20352a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[1000px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <TripsHeader controller={controller} />
        <TripsFilters controller={controller} />
        <TripsList controller={controller} />
      </div>
      <CreateTripWizard open={controller.createOpen} onClose={() => controller.setCreateOpen(false)} />
      <BottomNav />
    </main>
  );
}
