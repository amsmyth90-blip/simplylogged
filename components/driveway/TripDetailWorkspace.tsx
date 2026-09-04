"use client";

import Link from "next/link";

import { BottomNav } from "@/components/BottomNav";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import { tripDestination, tripNights } from "@/lib/trip-records";

import { TripAddModal } from "./trip-detail/TripAddModal";
import { TripBookingsSection } from "./trip-detail/TripBookingsSection";
import { TripChecklistSection } from "./trip-detail/TripChecklistSection";
import { TripDocumentsSection } from "./trip-detail/TripDocumentsSection";
import { TripEmergencySection } from "./trip-detail/TripEmergencySection";
import { TripExpensesSection } from "./trip-detail/TripExpensesSection";
import { TripInsuranceSection } from "./trip-detail/TripInsuranceSection";
import { TripItinerarySection } from "./trip-detail/TripItinerarySection";
import { TripOverviewSection } from "./trip-detail/TripOverviewSection";
import { TripSettingsSection } from "./trip-detail/TripSettingsSection";
import { TripTravellersSection } from "./trip-detail/TripTravellersSection";
import {
  formatTripDate,
  sectionDetails,
  tripCountdownLabel,
  tripSections,
  tripStatusLabel,
  type TripSection,
} from "./trip-detail/trip-detail-shared";
import { useTripDetailController } from "./trip-detail/useTripDetailController";

export { tripSections } from "./trip-detail/trip-detail-shared";
export type { TripSection } from "./trip-detail/trip-detail-shared";

function TripSectionContent({
  section,
  controller,
}: {
  section: TripSection;
  controller: ReturnType<typeof useTripDetailController>;
}) {
  if (section === "itinerary")
    return <TripItinerarySection controller={controller} />;
  if (section === "bookings")
    return <TripBookingsSection controller={controller} />;
  if (section === "documents")
    return <TripDocumentsSection controller={controller} />;
  if (section === "checklist")
    return <TripChecklistSection controller={controller} />;
  if (section === "travellers")
    return <TripTravellersSection controller={controller} />;
  if (section === "insurance")
    return <TripInsuranceSection controller={controller} />;
  if (section === "expenses")
    return <TripExpensesSection controller={controller} />;
  if (section === "emergency")
    return <TripEmergencySection controller={controller} />;
  if (section === "settings")
    return <TripSettingsSection controller={controller} />;
  return <TripOverviewSection controller={controller} />;
}

export function TripDetailWorkspace({
  tripId,
  section = "overview",
}: {
  tripId: string;
  section?: TripSection;
}) {
  const controller = useTripDetailController(tripId);
  const {
    state,
    updateState,
    hydrated,
    router,
    trip,
    addMode,
    message,
    deleteOpen,
    readiness,
    people,
    setAddMode,
    setDeleteOpen,
    saveTrip,
  } = controller;
  if (!hydrated)
    return (
      <main className="min-h-screen bg-[#f5f1e8] p-6">
        <div className="mx-auto h-80 max-w-[1000px] animate-pulse rounded-[28px] bg-white/70" />
      </main>
    );
  if (!trip)
    return (
      <main className="min-h-screen bg-[#f5f1e8] px-4 py-12 text-center text-[#20352a]">
        <UiIcon name="alert" className="mx-auto h-8 w-8 text-[#8a5145]" />
        <h1 className="mt-4 font-serif text-2xl">Trip unavailable</h1>
        <p className="mt-2 text-sm text-[#667068]">
          This trip does not exist in your private DiaryDock records, or access
          is no longer available.
        </p>
        <Link
          href="/driveway/trips"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white"
        >
          Back to My Trips
        </Link>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-32 text-[#20352a]">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[1080px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="overflow-hidden rounded-[28px] bg-[#2f5140] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.65)]">
          <div className="flex items-start gap-3">
            <Link
              href="/driveway/trips"
              aria-label="Back to My Trips"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10"
            >
              <UiIcon name="arrow-left" className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                {trip.tripType}
              </p>
              <h1 className="mt-1 truncate font-serif text-3xl">
                {trip.title}
              </h1>
              <p className="mt-1 text-xs text-white/72">
                {tripDestination(trip)} · {formatTripDate(trip.startDate)} –{" "}
                {formatTripDate(trip.endDate)} · {tripNights(trip)} nights
              </p>
            </div>
            <span className="rounded-full bg-white/12 px-3 py-2 text-[10px] font-semibold">
              {tripStatusLabel(trip.status)}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/[0.08] p-3">
              <p className="text-lg font-bold">{readiness.percent}%</p>
              <p className="text-[9px] uppercase text-white/60">Readiness</p>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-3">
              <p className="text-lg font-bold">
                {trip.travellerRecords.length}
              </p>
              <p className="text-[9px] uppercase text-white/60">Travellers</p>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-3">
              <p className="text-sm font-bold">{tripCountdownLabel(trip)}</p>
              <p className="text-[9px] uppercase text-white/60">Timing</p>
            </div>
          </div>
        </header>
        <nav
          aria-label="Trip sections"
          className="mt-4 flex gap-2 overflow-x-auto pb-2"
        >
          {tripSections.map((item) => (
            <Link
              key={item}
              href={`/driveway/trips/${trip.id}/${item}`}
              aria-current={section === item ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${section === item ? "bg-[#2f5140] text-white" : "border border-[#20352a]/10 bg-white/82 text-[#52705a]"}`}
            >
              <UiIcon
                name={sectionDetails[item].icon}
                className="h-3.5 w-3.5"
              />
              {sectionDetails[item].label}
            </Link>
          ))}
        </nav>
        {message ? (
          <div
            role="status"
            className="mt-3 rounded-2xl border border-[#9fb58f]/40 bg-[#e8f0e3] px-4 py-3 text-xs text-[#315b42]"
          >
            {message}
          </div>
        ) : null}
        <div className="mt-5">
          <TripSectionContent section={section} controller={controller} />
        </div>
      </div>
      <TripAddModal
        key={`${addMode}-${trip.updatedAt}`}
        mode={addMode}
        trip={trip}
        vaultDocuments={state.vaultDocuments}
        people={people}
        onClose={() => setAddMode(null)}
        onSave={saveTrip}
      />
      <ModalShell
        open={deleteOpen}
        title="Delete this trip?"
        subtitle="The trip and its checklist will be removed. Linked documents remain safely stored in All Files."
        onClose={() => setDeleteOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="min-h-12 rounded-2xl border border-[#20352a]/10 bg-white text-sm font-semibold"
            >
              Keep trip
            </button>
            <button
              type="button"
              onClick={() => {
                updateState((current) => ({
                  ...current,
                  trips: {
                    trips: current.trips.trips.filter(
                      (item) => item.id !== trip.id,
                    ),
                  },
                  travelChecklist: {
                    items: current.travelChecklist.items.filter(
                      (item) => item.tripId !== trip.id,
                    ),
                  },
                }));
                setDeleteOpen(false);
                router.push("/driveway/trips");
              }}
              className="min-h-12 rounded-2xl bg-[#8a5145] text-sm font-semibold text-white"
            >
              Delete trip
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-[#667068]">
          This cannot be undone from DiaryDock. Your private files are not
          deleted.
        </p>
      </ModalShell>
      <BottomNav />
    </main>
  );
}
