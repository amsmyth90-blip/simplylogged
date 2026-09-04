"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { tripDestination } from "@/lib/trip-records";

import { daysUntilTrip, tripDateRange } from "./trips-model";
import type { TripsDirectoryController } from "./useTripsDirectory";

export function TripsHeader({ controller }: { controller: TripsDirectoryController }) {
  const {
    setCreateOpen, nextTrip, tripsThisYear, checklistRemaining, travelReminders,
    documentsToReview
  } = controller;
  return (
    <>
      <header className="flex items-start gap-3">
        <Link href="/room/driveway" aria-label="Back to Driveway" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="arrow-left" className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">Travel Room</p>
          <h1 className="font-serif text-3xl leading-tight tracking-tight">My Trips</h1>
          <p className="mt-1 text-xs text-[#667068]">Plan, organise and keep every journey in one place.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="plus" className="h-4 w-4" />Add trip</button>
      </header>
      <section className="mt-6 rounded-[28px] bg-[#2f5140] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.65)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">Next journey</p>
            <h2 className="mt-2 font-serif text-2xl">{nextTrip?.title ?? "Your next adventure starts here"}</h2>
            <p className="mt-2 text-sm text-white/72">{nextTrip ? `${tripDestination(nextTrip)} · ${tripDateRange(nextTrip)}` : "Create a trip when you're ready to begin planning."}</p>
          </div>
          {nextTrip ? <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold">{daysUntilTrip(nextTrip.startDate)} days</span> : null}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: tripsThisYear, label: "Trips this year" },
            { value: checklistRemaining, label: "Checklist left" },
            { value: travelReminders, label: "Travel reminders" },
            { value: documentsToReview, label: "Docs to review" }
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-white/12 bg-white/[0.08] px-3 py-3">
              <p className="text-xl font-semibold">{item.value}</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/62">{item.label}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
