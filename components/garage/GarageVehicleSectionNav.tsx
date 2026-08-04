"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UiIcon, type IconName } from "@/components/UiIcon";

const sections: { id: string; label: string; shortLabel: string; icon: IconName; path: string }[] = [
  { id: "profile", label: "Vehicle Profile", shortLabel: "Profile", icon: "car", path: "" },
  { id: "mot-tax", label: "MOT & Tax", shortLabel: "MOT & Tax", icon: "calendar", path: "/mot-tax" },
  { id: "insurance", label: "Insurance", shortLabel: "Insurance", icon: "shield", path: "/insurance" },
  { id: "servicing", label: "Servicing & Repairs", shortLabel: "Servicing", icon: "gear", path: "/servicing" },
  { id: "costs", label: "Costs & Receipts", shortLabel: "Costs", icon: "chart", path: "/costs" },
];

function activeSection(pathname: string, vehicleBase: string) {
  const suffix = pathname.slice(vehicleBase.length);
  if (suffix.startsWith("/mot-tax")) return "mot-tax";
  if (suffix.startsWith("/insurance")) return "insurance";
  if (suffix.startsWith("/servicing") || suffix.startsWith("/repairs")) return "servicing";
  if (suffix.startsWith("/costs")) return "costs";
  return "profile";
}

export function GarageVehicleSectionNav({ vehicleId }: { vehicleId: string }) {
  const pathname = usePathname();
  const base = `/garage/vehicles/${vehicleId}`;
  const active = activeSection(pathname, base);

  return (
    <nav aria-label="Garage vehicle sections" className="rounded-[20px] border border-[#20352a]/[0.08] bg-white/95 p-1.5 shadow-sm backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-1">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`${base}${section.path}`}
            aria-current={active === section.id ? "page" : undefined}
            aria-label={section.label}
            className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] px-0.5 text-[8px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:flex-row sm:gap-1.5 sm:px-2 sm:text-[10px] ${active === section.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}
          >
            <UiIcon name={section.icon} className="h-4 w-4 shrink-0" />
            <span>{section.shortLabel}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
