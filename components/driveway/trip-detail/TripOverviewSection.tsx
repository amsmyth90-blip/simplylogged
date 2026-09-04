"use client";
import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";
import {
  DetailCard,
  formatTripDate,
  SectionHeading,
} from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";

export function TripOverviewSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const {
    trip,
    readiness,
    notesDraft,
    remaining,
    tripChecklist,
    linkedDocuments,
    setNotesDraft,
    patchTrip,
    setMessage,
    addReminder,
  } = controller;
  if (!trip) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4">
          <SectionHeading
            title="Next actions"
            detail="Based on what has actually been added to this trip."
          />
          {readiness.ready === readiness.total ? (
            <p className="mt-4 rounded-2xl bg-[#e8f0e3] p-4 text-sm text-[#315b42]">
              Every tracked area is ready. Review the original records before
              relying on them.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {readiness.areas
                .filter((area) => !area.ready)
                .slice(0, 5)
                .map((area) => (
                  <Link
                    key={area.id}
                    href={`/driveway/trips/${trip.id}/${area.id === "transport" || area.id === "accommodation" ? "bookings" : area.id === "home" ? "checklist" : area.id}`}
                    className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f6f4ed] px-3 text-xs font-semibold capitalize"
                  >
                    <UiIcon name="alert" className="h-4 w-4 text-[#b07938]" />
                    Review {area.id}
                    <UiIcon
                      name="chevron-right"
                      className="ml-auto h-4 w-4 text-[#667068]"
                    />
                  </Link>
                ))}
            </div>
          )}
        </section>
        <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4">
          <SectionHeading
            title="Timeline preview"
            detail="Your next itinerary items."
            action={
              <Link
                href={`/driveway/trips/${trip.id}/itinerary`}
                className="min-h-11 px-2 text-xs font-semibold text-[#52705a]"
              >
                View all
              </Link>
            }
          />
          {trip.itinerary.length ? (
            <div className="mt-4 space-y-2">
              {[...trip.itinerary]
                .sort((a, b) =>
                  `${a.date}${a.startTime}`.localeCompare(
                    `${b.date}${b.startTime}`,
                  ),
                )
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-2xl bg-[#f6f4ed] p-3"
                  >
                    <span className="text-[10px] font-semibold text-[#52705a]">
                      {formatTripDate(item.date)}
                      <br />
                      {item.startTime}
                    </span>
                    <span>
                      <span className="block text-xs font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[10px] text-[#667068]">
                        {item.location || item.type}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#667068]">
              No itinerary items yet.
            </p>
          )}
        </section>
        <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4">
          <SectionHeading
            title="Trip notes"
            detail="General notes for this journey."
          />
          <textarea
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            rows={4}
            className="mt-4 w-full rounded-2xl border border-[#20352a]/10 bg-[#fffdf8] p-3 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              patchTrip({ notes: notesDraft });
              setMessage("Trip notes saved.");
            }}
            className="mt-3 min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
          >
            Save notes
          </button>
        </section>
      </div>
      <aside className="space-y-3">
        <DetailCard
          icon="briefcase"
          title={`${trip.bookings.length} bookings`}
          detail="Transport, accommodation and reservations"
          href={`/driveway/trips/${trip.id}/bookings`}
        />
        <DetailCard
          icon="check"
          title={`${remaining} checklist items left`}
          detail={`${tripChecklist.length ? Math.round(((tripChecklist.length - remaining) / tripChecklist.length) * 100) : 0}% complete`}
          href={`/driveway/trips/${trip.id}/checklist`}
        />
        <DetailCard
          icon="file"
          title={`${linkedDocuments.length} linked documents`}
          detail={`${linkedDocuments.filter((entry) => entry.document.reviewStatus === "needs-review").length} need review`}
          href={`/driveway/trips/${trip.id}/documents`}
        />
        <DetailCard
          icon="users"
          title={`${trip.travellerRecords.length} travellers`}
          detail="Linked to canonical people records"
          href={`/driveway/trips/${trip.id}/travellers`}
        />
        <DetailCard
          icon="bell"
          title="Add a reminder"
          detail="Use DiaryDock's shared reminder system"
          onClick={() => void addReminder()}
        />
        <div className="rounded-[20px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/65 p-4">
          <p className="text-xs font-semibold">Weather</p>
          <p className="mt-1 text-[10px] leading-4 text-[#667068]">
            Weather is not connected yet. DiaryDock will not show an unreliable
            placeholder forecast.
          </p>
        </div>
      </aside>
    </div>
  );
}
