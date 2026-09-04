"use client";

import { parseGarageMutation } from "@diarydock/vehicles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { VehicleHeader } from "@/components/garage/VehicleProfileUi";
import {
  PRODUCT_ANALYTICS_EVENTS,
  trackProductAnalytics,
} from "@/lib/product-analytics";
import {
  createVehicleRecord,
  MAX_GARAGE_VEHICLES,
} from "@/lib/vehicle-records";

type Draft = {
  nickname: string;
  make: string;
  model: string;
  registration: string;
  year: string;
};

const emptyDraft: Draft = {
  nickname: "",
  make: "",
  model: "",
  registration: "",
  year: "",
};

export function NewVehicleWorkspace() {
  const router = useRouter();
  const { state, hydrated, updateState } = useDiaryDockData();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const vehicles = state.vehicles.vehicles;
  const atCapacity = vehicles.length >= MAX_GARAGE_VEHICLES;

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!hydrated) {
      setError("Your Garage is still opening. Please try again in a moment.");
      return;
    }
    if (atCapacity) {
      setError(`A Garage can contain up to ${MAX_GARAGE_VEHICLES} vehicles.`);
      return;
    }

    try {
      const mutation = parseGarageMutation({
        operation: "ADD_VEHICLE",
        revision: null,
        vehicleId: crypto.randomUUID(),
        nickname: draft.nickname,
        make: draft.make,
        model: draft.model,
        registration: draft.registration,
        year: draft.year.trim() ? Number(draft.year) : null,
      });
      if (mutation.operation !== "ADD_VEHICLE") return;
      const vehicle = createVehicleRecord(mutation);
      const isFirstVehicle = vehicles.length === 0;
      setSaving(true);
      updateState((current) => ({
        ...current,
        vehicles: {
          ...current.vehicles,
          vehicles: [
            vehicle,
            ...current.vehicles.vehicles.filter(
              (candidate) => candidate.id !== vehicle.id,
            ),
          ],
        },
      }));
      if (isFirstVehicle) {
        void trackProductAnalytics(
          PRODUCT_ANALYTICS_EVENTS.FIRST_VEHICLE_ADDED,
          {},
        );
      }
      router.push(`/garage/vehicles/${vehicle.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add this vehicle.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
      <VehicleHeader title="Add a vehicle" />
      <BillsCard>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#dde6d8] text-[#45604d]">
            <UiIcon name="car" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[17px] font-semibold text-[#20352a]">
              Vehicle profile
            </h1>
            <p className="mt-1 text-[12px] leading-5 text-[#667068]">
              Add the essentials now. You can complete dates, documents,
              insurance and maintenance after saving.
            </p>
          </div>
        </div>

        {atCapacity ? (
          <div className="mt-5 rounded-[16px] bg-[#f7e4df] px-4 py-4 text-sm text-[#8c493f]">
            This Garage has reached its {MAX_GARAGE_VEHICLES}-vehicle limit.
            <Link href={`/garage/vehicles/${vehicles[0]?.id}`} className="ml-1 font-semibold underline">
              Open your vehicles
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <VehicleField label="Vehicle name" value={draft.nickname} maxLength={160} onChange={(value) => set("nickname", value)} />
              <VehicleField label="Registration" value={draft.registration} maxLength={32} onChange={(value) => set("registration", value.toUpperCase())} />
              <VehicleField label="Make" value={draft.make} maxLength={100} onChange={(value) => set("make", value)} />
              <VehicleField label="Model" value={draft.model} maxLength={100} onChange={(value) => set("model", value)} />
              <VehicleField label="Year" value={draft.year} type="number" onChange={(value) => set("year", value)} />
            </div>
            {error ? <p role="alert" className="rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#8c493f]">{error}</p> : null}
            <button
              type="submit"
              disabled={!hydrated || saving}
              className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
            >
              {saving ? "Opening vehicle…" : hydrated ? "Add vehicle" : "Opening Garage…"}
            </button>
          </form>
        )}
      </BillsCard>
    </div>
  );
}

function VehicleField({
  label,
  value,
  onChange,
  maxLength,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  type?: "text" | "number";
}) {
  return (
    <label className="block text-xs font-semibold text-[#667068]">
      {label}
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        min={type === "number" ? 1886 : undefined}
        max={type === "number" ? 2200 : undefined}
        inputMode={type === "number" ? "numeric" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}
