"use client";
import { SectionHeading } from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";
const fields = [
  { key: "destinationEmergencyNumber", label: "Destination emergency number" },
  { key: "localContact", label: "Local contact" },
  { key: "accommodationAddress", label: "Accommodation address" },
  { key: "embassyNotes", label: "Embassy or consulate notes" },
  {
    key: "medicalNotes",
    label: "Critical medical notes (only if appropriate)",
  },
  { key: "lostPassportNotes", label: "Lost passport notes" },
  { key: "breakdownDetails", label: "Road-trip breakdown details" },
  { key: "documentLocationNotes", label: "Important document locations" },
] as const;
export function TripEmergencySection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { emergencyDraft, setEmergencyDraft, patchTrip, setMessage } =
    controller;
  return (
    <section>
      <SectionHeading
        title="Emergency information"
        detail="User-entered, offline-friendly details. Verify official numbers before relying on them."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="block text-xs font-semibold">
            {field.label}
            <textarea
              rows={3}
              value={emergencyDraft[field.key]}
              onChange={(event) =>
                setEmergencyDraft((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 py-3 text-sm font-normal"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          patchTrip({ emergencyInfo: emergencyDraft });
          setMessage("Emergency information saved.");
        }}
        className="mt-5 min-h-12 rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white"
      >
        Save emergency information
      </button>
    </section>
  );
}
