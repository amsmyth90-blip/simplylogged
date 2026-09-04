"use client";
import {
  EmptySection,
  formatTripDate,
  formatTripMoney,
  SectionHeading,
} from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";

export function TripBookingsSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { trip, setAddMode } = controller;
  if (!trip) return null;
  return (
    <section>
      <SectionHeading
        title="Bookings"
        detail="Only user-confirmed records are shown as confirmed."
        action={
          <button
            type="button"
            onClick={() => setAddMode("booking")}
            className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
          >
            + Add booking
          </button>
        }
      />
      {trip.bookings.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {trip.bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#6f8e72]">
                    {booking.type}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold">
                    {booking.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#667068]">
                    {booking.provider || "Provider not added"}
                  </p>
                </div>
                <span className="rounded-full bg-[#eef2e9] px-2 py-1 text-[9px] font-semibold capitalize">
                  {booking.status.replace("-", " ")}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#667068]">Reference</dt>
                  <dd>{booking.bookingReference || "Not added"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#667068]">Starts</dt>
                  <dd>{formatTripDate(booking.startAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#667068]">Cost</dt>
                  <dd>{formatTripMoney(booking.amount, booking.currency)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptySection
            icon="briefcase"
            title="No bookings yet"
            detail="Add transport, accommodation, activities and reservations when you have them."
          />
        </div>
      )}
    </section>
  );
}
