import Link from "next/link";
import type { ChangeEvent } from "react";

import { UiIcon } from "@/components/UiIcon";
import { PrivateVehicleImage } from "@/components/garage/VehicleProfileUi";
import { cleanText, type VehicleTab } from "@/components/garage/vehicle-profile-model";
import type { VaultDocument } from "@/lib/mock-data";
import {
  MAX_GARAGE_VEHICLES,
  vehicleDisplayName,
  type VehicleMileageEntry,
  type VehicleRecord,
} from "@/lib/vehicle-records";

type LocalTab = { id: VehicleTab; label: string };

export function VehicleChooser({
  vehicles,
  selectedId,
}: {
  vehicles: VehicleRecord[];
  selectedId: string;
}) {
  return (
    <nav aria-label="Choose a vehicle" className="flex gap-2 overflow-x-auto rounded-[18px] border border-[#20352a]/[0.07] bg-white/85 p-2 shadow-sm">
      {vehicles.map((vehicle) => (
        <Link
          key={vehicle.id}
          href={`/garage/vehicles/${vehicle.id}`}
          aria-current={vehicle.id === selectedId ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[13px] px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${vehicle.id === selectedId ? "bg-[#355540] text-white" : "bg-[#eef2e9] text-[#52705a]"}`}
        >
          <UiIcon name="car" className="h-4 w-4" />
          {cleanText(vehicleDisplayName(vehicle))}
        </Link>
      ))}
      {vehicles.length < MAX_GARAGE_VEHICLES ? (
        <Link
          href="/garage/vehicles/new"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[13px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#52705a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add vehicle
        </Link>
      ) : null}
    </nav>
  );
}

export function VehicleHero({
  vehicle,
  vehicleName,
  primaryPhoto,
  tab,
  mileage,
  uploadingPhoto,
  onPhoto,
}: {
  vehicle: VehicleRecord;
  vehicleName: string;
  primaryPhoto?: VaultDocument;
  tab: VehicleTab;
  mileage?: VehicleMileageEntry;
  uploadingPhoto: boolean;
  onPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  if (tab !== "overview") {
    return (
      <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-[0_16px_36px_-30px_rgba(32,53,42,0.45)]">
        <div className="relative flex h-[68px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_70%_20%,#edf3e9,#e6e3d9)] text-[#526b52]">
          <PrivateVehicleImage document={primaryPhoto} alt={`${vehicleName} primary vehicle`} className="absolute inset-0 h-full w-full object-cover" />
          {!primaryPhoto ? <UiIcon name="car" className="h-9 w-9" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#20352a]">{vehicleName}</p>
          <p className="mt-1 truncate text-[11px] text-[#667068]">
            {[vehicle.registration || "No registration", vehicle.year, vehicle.fuelType, mileage ? `${mileage.mileage.toLocaleString("en-GB")} miles` : "Mileage not recorded"].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-[#20352a]/[0.08] bg-[#fffdf8] shadow-[0_18px_42px_-32px_rgba(32,53,42,0.45)]">
      <div className="relative flex min-h-[230px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_75%_20%,#edf3e9,#f8f6ef_58%,#e8e4da)] sm:min-h-[300px]">
        <PrivateVehicleImage document={primaryPhoto} alt={`${vehicleName} primary vehicle`} className="absolute inset-0 h-full w-full object-cover" />
        {!primaryPhoto ? (
          <div className="relative z-10 text-center text-[#526b52]">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#6f8e72]/20 bg-white/65"><UiIcon name="car" className="h-10 w-10" /></span>
            <p className="mt-3 text-sm font-semibold">Add your vehicle photo</p>
            <p className="mt-1 text-[11px] text-[#667068]">Only a photo you upload will appear here.</p>
          </div>
        ) : null}
        <label className="absolute right-4 top-4 z-20 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 text-xs font-semibold text-[#20352a] shadow-sm backdrop-blur-md focus-within:ring-2 focus-within:ring-[#6f8e72]">
          <UiIcon name="camera" className="h-4 w-4" />
          {uploadingPhoto ? "Adding…" : primaryPhoto ? "Change photo" : "Add photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={onPhoto} disabled={uploadingPhoto} className="sr-only" />
        </label>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Vehicle profile</p>
            <h1 className="mt-1 font-serif text-[34px] leading-none tracking-[-0.03em] text-[#20352a]">{vehicleName}</h1>
            <p className="mt-2 text-[13px] text-[#667068]">{[vehicle.year, vehicle.category, vehicle.fuelType].filter(Boolean).join(" · ") || "Add the details that help identify this vehicle"}</p>
          </div>
          <span className="rounded-[12px] bg-[#f1f2ec] px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#20352a]">{vehicle.registration || "No reg"}</span>
        </div>
      </div>
    </section>
  );
}

export function VehicleLocalTabs({
  vehicleId,
  tab,
  tabs,
}: {
  vehicleId: string;
  tab: VehicleTab;
  tabs: LocalTab[];
}) {
  if (!tabs.length) return null;
  const maintenance = tab === "servicing" || tab === "repairs";
  return (
    <nav aria-label={maintenance ? "Servicing and repair views" : "Vehicle profile views"} className="sticky top-2 z-30 overflow-x-auto rounded-[18px] border border-[#20352a]/[0.07] bg-white/95 p-1.5 shadow-sm backdrop-blur-xl">
      <div className={`grid gap-1 ${tabs.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {tabs.map((item) => {
          const href = item.id === "overview" ? `/garage/vehicles/${vehicleId}` : `/garage/vehicles/${vehicleId}/${item.id}`;
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-[13px] px-1 text-[10px] font-semibold transition sm:px-3 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${active ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
