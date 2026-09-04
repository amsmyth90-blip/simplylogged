"use client";

import Link from "next/link";

import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import { VehicleCostInsights } from "./vehicle-costs/VehicleCostInsights";
import {
  VehicleCostCategories,
  VehicleExpenseHistory,
} from "./vehicle-costs/VehicleCostLists";
import { VehicleCostOverview } from "./vehicle-costs/VehicleCostOverview";
import { useVehicleCosts } from "./vehicle-costs/useVehicleCosts";
import type { VehicleCostView } from "./vehicle-costs/vehicle-cost-model";

export type { VehicleCostView } from "./vehicle-costs/vehicle-cost-model";

export function VehicleCostsPanel({
  vehicle,
  view: activeView,
  onAddExpense,
  onEditExpense,
}: {
  vehicle: VehicleRecord;
  view: VehicleCostView;
  onAddExpense: () => void;
  onEditExpense: (expense: VehicleExpense) => void;
}) {
  const view = useVehicleCosts(vehicle, activeView);
  const base = `/garage/vehicles/${vehicle.id}/costs`;
  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "categories", label: "Categories", href: `${base}/categories` },
    { id: "expenses", label: "Expenses", href: `${base}/expenses` },
    { id: "receipts", label: "Receipts", href: `${base}/receipts` },
    { id: "insights", label: "Insights", href: `${base}/insights` },
  ] as const;

  return (
    <div className="space-y-4">
      <nav
        aria-label="Cost views"
        className="overflow-x-auto rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm"
      >
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={activeView === item.id ? "page" : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-[12px] px-0.5 text-[10px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:px-2 ${activeView === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {activeView === "overview" ? (
        <VehicleCostOverview
          view={view}
          base={base}
          onAddExpense={onAddExpense}
          onEditExpense={onEditExpense}
        />
      ) : null}
      {activeView === "categories" ? (
        <VehicleCostCategories view={view} />
      ) : null}
      {activeView === "expenses" ? (
        <VehicleExpenseHistory
          view={view}
          onAddExpense={onAddExpense}
          onEditExpense={onEditExpense}
        />
      ) : null}
      {activeView === "insights" ? (
        <VehicleCostInsights view={view} onAddExpense={onAddExpense} />
      ) : null}
    </div>
  );
}
