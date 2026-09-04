"use client";
import { UiIcon } from "@/components/UiIcon";
import {
  EmptySection,
  formatTripDate,
  SectionHeading,
} from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";

export function TripItinerarySection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { trip, setAddMode } = controller;
  if (!trip) return null;
  return (
    <section>
      <SectionHeading
        title="Itinerary"
        detail="A chronological plan for this trip."
        action={
          <button
            type="button"
            onClick={() => setAddMode("itinerary")}
            className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
          >
            + Add item
          </button>
        }
      />
      {trip.itinerary.length ? (
        <div className="mt-5 space-y-3">
          {[...trip.itinerary]
            .sort((a, b) =>
              `${a.date}${a.startTime}${a.sortOrder}`.localeCompare(
                `${b.date}${b.startTime}${b.sortOrder}`,
              ),
            )
            .map((item) => (
              <article
                key={item.id}
                className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
              >
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
                    <UiIcon name="calendar" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <span className="text-[10px] text-[#667068]">
                        {item.confirmed ? "Confirmed" : "Not confirmed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#667068]">
                      {formatTripDate(item.date)} ·{" "}
                      {item.startTime || "Time not added"} ·{" "}
                      {item.location || item.type}
                    </p>
                    {item.notes ? (
                      <p className="mt-2 text-xs leading-5 text-[#4f6256]">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptySection
            icon="calendar"
            title="No itinerary yet"
            detail="Add transport, check-ins, activities and free time in date order."
          />
        </div>
      )}
    </section>
  );
}
