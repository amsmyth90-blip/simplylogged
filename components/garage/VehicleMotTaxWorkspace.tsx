"use client";

import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { MotTaxChrome } from "@/components/garage/mot-tax/MotTaxChrome";
import { MotTaxDocuments } from "@/components/garage/mot-tax/MotTaxDocuments";
import { MotTaxHistory } from "@/components/garage/mot-tax/MotTaxHistory";
import { MotTaxKeyDates } from "@/components/garage/mot-tax/MotTaxKeyDates";
import { MotTaxOverview } from "@/components/garage/mot-tax/MotTaxOverview";
import {
  MotTaxProvider,
  useMotTax,
} from "@/components/garage/mot-tax/MotTaxContext";
import type { MotTaxView } from "@/components/garage/mot-tax/mot-tax-model";
import { RoadTaxView } from "@/components/garage/mot-tax/RoadTaxView";

export type { MotTaxView };

export function VehicleMotTaxWorkspace({
  vehicleId,
  view = "overview",
}: {
  vehicleId: string;
  view?: MotTaxView;
}) {
  return (
    <MotTaxProvider vehicleId={vehicleId} view={view}>
      <MotTaxContent />
    </MotTaxProvider>
  );
}

function MotTaxContent() {
  const motTax = useMotTax();
  if (!motTax.hydrated) {
    return (
      <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">
        Opening MOT &amp; Tax…
      </div>
    );
  }
  if (!motTax.vehicle) {
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

  return (
    <MotTaxChrome>
      {motTax.view === "overview" ? <MotTaxOverview /> : null}
      {motTax.view === "history" ? <MotTaxHistory /> : null}
      {motTax.view === "road-tax" ? <RoadTaxView /> : null}
      {motTax.view === "key-dates" ? <MotTaxKeyDates /> : null}
      {motTax.view === "documents" ? <MotTaxDocuments /> : null}
    </MotTaxChrome>
  );
}
