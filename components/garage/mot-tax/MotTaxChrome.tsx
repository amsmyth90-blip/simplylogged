import Link from "next/link";
import type { ReactNode } from "react";

import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { UiIcon } from "@/components/UiIcon";

import { type MotTaxView } from "./mot-tax-model";
import { MotTaxDialogs } from "./MotTaxDialogs";
import { useMotTax } from "./MotTaxContext";

export function MotTaxChrome({ children }: { children: ReactNode }) {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  const views: { id: MotTaxView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: motTax.base },
    { id: "history", label: "MOT History", href: `${motTax.base}/history` },
    { id: "road-tax", label: "Road Tax", href: `${motTax.base}/road-tax` },
    { id: "key-dates", label: "Key Dates", href: `${motTax.base}/key-dates` },
    { id: "documents", label: "Documents", href: `${motTax.base}/documents` },
  ];

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
          MOT &amp; Tax
        </h1>
        <Link
          href="/reminders"
          aria-label="Open reminders"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="bell" className="h-5 w-5" />
        </Link>
      </header>
      <GarageVehicleSectionNav vehicleId={motTax.vehicle.id} />
      <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm">
        <span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]">
          <UiIcon name="car" className="h-9 w-9" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#20352a]">
            {motTax.vehicleName}
          </p>
          <p className="mt-1 truncate text-[11px] text-[#667068]">
            {motTax.vehicle.registration || "No registration"} ·{" "}
            {motTax.mileage
              ? `${motTax.mileage.mileage.toLocaleString("en-GB")} miles`
              : "Mileage not recorded"}
          </p>
        </div>
      </section>
      <nav
        aria-label="MOT and tax views"
        className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm"
      >
        <div className="grid grid-cols-5 gap-1">
          {views.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={motTax.view === item.id ? "page" : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-[12px] px-0.5 text-center text-[10px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:px-2 ${motTax.view === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
        DiaryDock helps you organise vehicle dates and documents. It does not
        confirm legal status or replace official DVLA and MOT records.
      </p>
      <MotTaxDialogs />
    </div>
  );
}
