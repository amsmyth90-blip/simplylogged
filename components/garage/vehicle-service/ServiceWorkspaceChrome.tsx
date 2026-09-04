import Link from "next/link";
import type { ReactNode } from "react";

import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";

import { type ServiceRecordsView } from "./service-model";
import { ServiceDialogs } from "./ServiceDialogs";
import { useServiceRecords } from "./ServiceRecordsContext";
import { ServiceHeader, ServiceVehicleSummary } from "./ServiceUi";

export function ServiceWorkspaceChrome({ children }: { children: ReactNode }) {
  const service = useServiceRecords();
  if (!service.vehicle) return null;

  const views: { id: ServiceRecordsView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: service.base },
    { id: "history", label: "History", href: `${service.base}?view=history` },
    {
      id: "maintenance",
      label: "Maintenance",
      href: `${service.base}?view=maintenance`,
    },
    {
      id: "reminders",
      label: "Reminders",
      href: `${service.base}?view=reminders`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
      <ServiceHeader
        title="Service Records"
        backHref="/room/garage"
        action={
          <button
            type="button"
            onClick={() => service.openNewService("service")}
            className="min-h-11 rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45]"
          >
            + Add Service
          </button>
        }
      />
      <GarageVehicleSectionNav vehicleId={service.vehicle.id} />
      <nav
        aria-label="Service record views"
        className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm"
      >
        <div className="grid grid-cols-4 gap-1">
          {views.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={service.view === item.id ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-[12px] px-1 text-center text-[9px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:text-[10px] ${service.view === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <ServiceVehicleSummary
        vehicle={service.vehicle}
        name={service.vehicleName}
        mileage={service.mileage}
      />
      {children}
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
        DiaryDock organises the vehicle service information you enter. Always
        confirm service schedules, work carried out and safety advice with a
        qualified garage or manufacturer.
      </p>
      <ServiceDialogs />
    </div>
  );
}
