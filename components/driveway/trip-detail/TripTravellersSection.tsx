"use client";
import { UiIcon } from "@/components/UiIcon";
import { EmptySection, SectionHeading } from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";
export function TripTravellersSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { trip, setAddMode, patchTrip } = controller;
  if (!trip) return null;
  return (
    <section>
      <SectionHeading
        title="Travellers"
        detail="People are linked to canonical records; sensitive details are not copied."
        action={
          <button
            type="button"
            onClick={() => setAddMode("traveller")}
            className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
          >
            + Add traveller
          </button>
        }
      />
      {trip.travellerRecords.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {trip.travellerRecords.map((traveller) => (
            <article
              key={traveller.id}
              className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfe7d8] text-sm font-bold">
                  {traveller.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">
                    {traveller.displayName}
                  </h3>
                  <p className="mt-1 text-[10px] capitalize text-[#667068]">
                    {traveller.travellerType} · {traveller.source} record
                    {traveller.isLead ? " · Lead" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patchTrip({
                      travellerRecords: trip.travellerRecords.filter(
                        (item) => item.id !== traveller.id,
                      ),
                    })
                  }
                  aria-label={`Remove ${traveller.displayName}`}
                  className="h-11 w-11 text-[#8a5145]"
                >
                  <UiIcon name="plus" className="mx-auto h-4 w-4 rotate-45" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptySection
            icon="users"
            title="No travellers linked"
            detail="Add a household member, existing contact or display-only guest."
          />
        </div>
      )}
    </section>
  );
}
