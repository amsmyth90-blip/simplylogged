"use client";
import { useState } from "react";
import type { Trip } from "@/lib/trip-records";

export function TripDetailsSettings({
  trip,
  onSave,
}: {
  trip: Trip;
  onSave: (trip: Trip) => void;
}) {
  const [draft, setDraft] = useState({
    title: trip.title,
    destinationCity: trip.destinationCity,
    destinationCountry: trip.destinationCountry,
    destinationTimezone: trip.destinationTimezone,
    startDate: trip.startDate,
    endDate: trip.endDate,
    currency: trip.currency,
  });
  const [error, setError] = useState("");
  const save = () => {
    if (!draft.title.trim()) {
      setError("Trip title is required.");
      return;
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      setError("The return date must be on or after departure.");
      return;
    }
    onSave({
      ...trip,
      ...draft,
      title: draft.title.trim(),
      destination: [
        draft.destinationCity.trim(),
        draft.destinationCountry.trim(),
      ]
        .filter(Boolean)
        .join(", "),
      updatedAt: new Date().toISOString(),
    });
    setError("");
  };
  return (
    <div className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4 md:col-span-2">
      <h3 className="text-sm font-semibold">Trip details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Trip title
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Timezone
          <input
            value={draft.destinationTimezone}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                destinationTimezone: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Destination city
          <input
            value={draft.destinationCity}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                destinationCity: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Country
          <input
            value={draft.destinationCountry}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                destinationCountry: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Departure
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Return
          <input
            type="date"
            value={draft.endDate}
            min={draft.startDate}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Currency
          <input
            value={draft.currency}
            maxLength={3}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                currency: event.target.value.toUpperCase(),
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal uppercase"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-[#8a5145]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        className="mt-4 min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
      >
        Save trip details
      </button>
    </div>
  );
}
