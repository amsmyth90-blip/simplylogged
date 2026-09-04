"use client";

import { UiIcon } from "@/components/UiIcon";

import { EmptyTrips, TripCard } from "./TripCard";
import { tripSections } from "./trips-model";
import type { TripsDirectoryController } from "./useTripsDirectory";

export function TripsList({ controller }: { controller: TripsDirectoryController }) {
  const { state, setCreateOpen, groups, visibleTrips } = controller;
  return (
    <div className="mt-6 space-y-7">
      {state.trips.trips.length === 0 ? (
        <EmptyTrips onCreate={() => setCreateOpen(true)} />
      ) : tripSections.map(section => groups[section.key].length ? (
        <section key={section.key}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e4eadf] text-[#52705a]"><UiIcon name={section.icon} className="h-4 w-4" /></span>
            <div><h2 className="font-serif text-xl">{section.title}</h2><p className="text-[10px] text-[#667068]">{section.description}</p></div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {groups[section.key].map(trip => <TripCard key={trip.id} trip={trip} checklistItems={state.travelChecklist.items} reminders={state.reminders} />)}
          </div>
        </section>
      ) : null)}
      {state.trips.trips.length > 0 && visibleTrips.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#6f8e72]/30 bg-white/60 px-5 py-10 text-center text-sm text-[#667068]">No trips match these search and filter choices.</div> : null}
    </div>
  );
}
