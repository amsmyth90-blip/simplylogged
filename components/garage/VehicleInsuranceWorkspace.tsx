"use client";

import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { InsuranceClaims } from "@/components/garage/vehicle-insurance/InsuranceClaims";
import { InsuranceDialogs } from "@/components/garage/vehicle-insurance/InsuranceDialogs";
import { InsuranceDocuments } from "@/components/garage/vehicle-insurance/InsuranceDocuments";
import { InsuranceOverview } from "@/components/garage/vehicle-insurance/InsuranceOverview";
import { InsurancePolicy } from "@/components/garage/vehicle-insurance/InsurancePolicy";
import { InsuranceRenewals } from "@/components/garage/vehicle-insurance/InsuranceRenewals";
import {
  VehicleInsuranceProvider,
  useVehicleInsuranceModel,
} from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import { VehicleSummary } from "@/components/garage/vehicle-insurance/InsuranceUi";
import { UiIcon } from "@/components/UiIcon";
import { latestMileage, vehicleDisplayName } from "@/lib/vehicle-records";

export type InsuranceView =
  | "claims"
  | "documents"
  | "overview"
  | "policy"
  | "renewals";

export function VehicleInsuranceWorkspace({
  vehicleId,
  view = "overview",
}: {
  vehicleId: string;
  view?: InsuranceView;
}) {
  return (
    <VehicleInsuranceProvider vehicleId={vehicleId}>
      <InsuranceWorkspaceContent view={view} />
    </VehicleInsuranceProvider>
  );
}

function InsuranceWorkspaceContent({ view }: { view: InsuranceView }) {
  const { hydrated, openPolicy, vehicle } = useVehicleInsuranceModel();
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">
        Opening Insurance…
      </div>
    );
  }
  if (!vehicle) {
    return (
      <div className="mx-auto max-w-[760px]">
        <BillsCard>
          <p className="text-sm font-semibold text-[#20352a]">
            Vehicle not found
          </p>
          <Link
            href="/room/garage"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#45604d]"
          >
            Back to Garage
          </Link>
        </BillsCard>
      </div>
    );
  }

  const base = `/garage/vehicles/${vehicle.id}/insurance`;
  const views: { id: InsuranceView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: base },
    { id: "policy", label: "Policy", href: `${base}?view=policy` },
    { id: "claims", label: "Claims", href: `${base}?view=claims` },
    { id: "documents", label: "Documents", href: `${base}?view=documents` },
    { id: "renewals", label: "Renewals", href: `${base}?view=renewals` },
  ];
  const mileage = latestMileage(vehicle)?.mileage ?? null;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
      <header className="flex min-h-14 items-center rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 px-2.5 shadow-sm">
        <Link
          href="/room/garage"
          aria-label="Back to Garage"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-lg text-[#20352a]">
          Insurance
        </h1>
        <button
          type="button"
          onClick={openPolicy}
          className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#315d45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          Edit
        </button>
      </header>
      <GarageVehicleSectionNav vehicleId={vehicle.id} />
      <nav
        aria-label="Insurance views"
        className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm"
      >
        <div className="grid grid-cols-5 gap-1">
          {views.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={view === item.id ? "page" : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-[12px] px-0.5 text-center text-[10px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:px-2 ${view === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <VehicleSummary
        vehicle={vehicle}
        name={vehicleDisplayName(vehicle)}
        mileage={mileage}
      />
      {view === "overview" ? <InsuranceOverview /> : null}
      {view === "policy" ? <InsurancePolicy /> : null}
      {view === "claims" ? <InsuranceClaims /> : null}
      {view === "documents" ? <InsuranceDocuments /> : null}
      {view === "renewals" ? <InsuranceRenewals /> : null}
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
        DiaryDock helps you organise motor-insurance information, documents and
        reminders. It does not confirm cover or provide financial, insurance or
        legal advice. Always check details with your insurer.
      </p>
      <InsuranceDialogs />
    </div>
  );
}
