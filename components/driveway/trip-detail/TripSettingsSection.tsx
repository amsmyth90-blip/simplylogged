"use client";
import { tripTypes, type TripStatus, type TripType } from "@/lib/trip-records";
import { SectionHeading, tripStatusLabel } from "./trip-detail-shared";
import { TripDetailsSettings } from "./TripDetailsSettings";
import type { TripDetailController } from "./useTripDetailController";
export function TripSettingsSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const {
    trip,
    saveTrip,
    patchTrip,
    setMessage,
    duplicateTrip,
    downloadPack,
    setDeleteOpen,
  } = controller;
  if (!trip) return null;
  const statuses: TripStatus[] = [
    "draft",
    "planning",
    "booked",
    "ready",
    "happening",
    "completed",
    "cancelled",
    "archived",
  ];
  return (
    <section>
      <SectionHeading
        title="Trip settings"
        detail="Manage the trip lifecycle, duplication and private offline summary."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TripDetailsSettings
          trip={trip}
          onSave={(next) => {
            saveTrip(next);
            setMessage("Trip details saved.");
          }}
        />
        <div className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4">
          <label className="block text-xs font-semibold">
            Status
            <select
              value={trip.status}
              onChange={(event) =>
                patchTrip({
                  status: event.target.value as TripStatus,
                  archivedAt:
                    event.target.value === "archived"
                      ? new Date().toISOString()
                      : undefined,
                })
              }
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {tripStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4">
          <label className="block text-xs font-semibold">
            Trip type
            <select
              value={trip.tripType}
              onChange={(event) =>
                patchTrip({ tripType: event.target.value as TripType })
              }
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              {tripTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={duplicateTrip}
          className="min-h-[76px] rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 text-left"
        >
          <span className="text-sm font-semibold">
            Duplicate trip structure
          </span>
          <span className="mt-1 block text-[10px] leading-4 text-[#667068]">
            Copies travellers, notes and checklist structure—not dates,
            bookings, documents, payments or insurance.
          </span>
        </button>
        <button
          type="button"
          onClick={downloadPack}
          className="min-h-[76px] rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 text-left"
        >
          <span className="text-sm font-semibold">
            Download Offline Trip Pack
          </span>
          <span className="mt-1 block text-[10px] leading-4 text-[#667068]">
            Creates a local text summary without identity documents by default.
          </span>
        </button>
        <div className="rounded-[20px] border border-[#d8dfd2] bg-[#eef2e9] p-4 md:col-span-2">
          <h3 className="text-sm font-semibold">Sharing & collaboration</h3>
          <p className="mt-2 text-xs leading-5 text-[#4f6256]">
            External trip access is not enabled in this build. DiaryDock will
            not pretend that a saved name grants access; server-enforced trip
            permissions and invitation acceptance must be approved and
            implemented first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="min-h-12 rounded-2xl border border-[#8a5145]/20 bg-white text-sm font-semibold text-[#8a5145] md:col-span-2"
        >
          Delete trip
        </button>
      </div>
    </section>
  );
}
