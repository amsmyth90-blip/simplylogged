"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { Reminder } from "@/lib/mock-data";
import {
  tripDestination,
  tripNights,
  tripReadiness,
  type Trip
} from "@/lib/trip-records";
import type { TravelChecklistItem } from "@/lib/travel-checklist-records";

import { tripDateRange, tripStatusLabel, tripStatusTone } from "./trips-model";

export function TripCard({
  trip,
  checklistItems,
  reminders
}: {
  trip: Trip;
  checklistItems: TravelChecklistItem[];
  reminders: Reminder[];
}) {
  const tripItems = checklistItems.filter(item => item.tripId === trip.id);
  const remaining = tripItems.filter(item => !item.completed).length;
  const progress = tripItems.length
    ? Math.round(((tripItems.length - remaining) / tripItems.length) * 100)
    : 0;
  const readiness = tripReadiness(trip, remaining, tripItems.length);
  const nextReminder = reminders.find(reminder =>
    trip.reminderIds.includes(reminder.id) && reminder.group !== "done"
  );
  const primaryTransport = trip.bookings.find(booking => booking.type !== "Accommodation");
  const accommodation = trip.bookings.find(booking => booking.type === "Accommodation");
  const nights = tripNights(trip);
  return (
    <Link href={`/driveway/trips/${trip.id}`} className="group block rounded-[24px] border border-[#20352a]/[0.07] bg-white/92 p-4 shadow-[0_20px_50px_-38px_rgba(32,53,42,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-36px_rgba(32,53,42,0.56)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e8eee3] text-[#315b42]"><UiIcon name="map-pin" className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0"><span className="block truncate font-serif text-xl text-[#20352a]">{trip.title}</span><span className="mt-0.5 block truncate text-xs text-[#667068]">{tripDestination(trip)}</span></span>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${tripStatusTone(trip.status)}`}>{tripStatusLabel(trip.status)}</span>
          </span>
          <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#667068]">
            <span className="inline-flex items-center gap-1.5"><UiIcon name="calendar" className="h-3.5 w-3.5" />{tripDateRange(trip)}</span>
            {nights ? <span>{nights} night{nights === 1 ? "" : "s"}</span> : null}
            <span>{trip.tripType}</span>
          </span>
        </span>
        <UiIcon name="chevron-right" className="mt-4 h-4 w-4 shrink-0 text-[#667068] transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
        <TripFact value={String(trip.travellerRecords.length || (trip.travellers ? 1 : 0))} label="Travellers" />
        <TripFact value={`${progress}%`} label="Checklist" />
        <TripFact value={primaryTransport?.type ?? (trip.transport || "Not added")} label="Transport" />
        <TripFact value={accommodation?.provider ?? (trip.accommodation || "Not added")} label="Stay" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#20352a]/[0.06] pt-3">
        <span className="min-w-0 text-[10px] text-[#667068]">{nextReminder ? `Next: ${nextReminder.title}` : "No upcoming trip reminder"}</span>
        <span className="shrink-0 text-[10px] font-semibold text-[#52705a]">{readiness.ready} of {readiness.total} areas ready</span>
      </div>
    </Link>
  );
}

function TripFact({ value, label }: { value: string; label: string }) {
  return <span className="rounded-[14px] bg-[#f4f4ee] px-3 py-2"><span className="block truncate font-bold text-[#315b42]">{value}</span><span className="text-[#667068]">{label}</span></span>;
}

export function EmptyTrips({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/72 px-6 py-12 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/90 text-[#52705a] shadow-sm"><UiIcon name="map-pin" className="h-7 w-7" /></span>
      <h2 className="mt-5 font-serif text-2xl text-[#20352a]">Your next adventure starts here</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667068]">Create a trip to organise its dates, travellers, bookings, checklist and important information in one calm place.</p>
      <button type="button" onClick={onCreate} className="mt-5 min-h-12 rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">Create your first trip</button>
    </div>
  );
}
