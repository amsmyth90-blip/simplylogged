import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import type { VehicleExpense } from "@/lib/vehicle-records";

import { money } from "./vehicle-cost-model";
import {
  CategoryLegend,
  CostsEmpty,
  ExpenseList,
  Metric,
  PeriodSelector,
  SectionTitle,
} from "./VehicleCostUi";
import type { VehicleCostsViewModel } from "./useVehicleCosts";

export function VehicleCostOverview({
  view,
  base,
  onAddExpense,
  onEditExpense,
}: {
  view: VehicleCostsViewModel;
  base: string;
  onAddExpense: () => void;
  onEditExpense: (expense: VehicleExpense) => void;
}) {
  return (
    <>
      <PeriodSelector value={view.period} onChange={view.setPeriod} />
      <div className="grid grid-cols-3 gap-2.5">
        <Metric
          label="Total spent"
          value={money(view.periodTotal)}
          helper={
            view.period === "all"
              ? "All recorded expenses"
              : view.period === "year"
                ? "This year"
                : "This month"
          }
        />
        <Metric
          label="Avg. per month"
          value={money(view.averagePerMonth)}
          helper={
            view.activeMonths
              ? `${view.activeMonths} recorded month${view.activeMonths === 1 ? "" : "s"}`
              : "No expense history"
          }
        />
        <Metric
          label="Cost per mile"
          value={
            view.costPerMile === null
              ? "Add mileage"
              : `${view.costPerMile.toFixed(1)}p`
          }
          helper={
            view.mileage
              ? `Based on ${view.mileage.toLocaleString("en-GB")} miles`
              : "Mileage is required"
          }
        />
      </div>
      <BillsCard>
        <SectionTitle
          title="Spend by category"
          detail="Based only on expenses recorded in DiaryDock"
        />
        {view.periodTotal ? (
          <div className="mt-5 grid items-center gap-6 sm:grid-cols-[180px_1fr]">
            <div
              className="relative mx-auto h-40 w-40 rounded-full"
              style={{
                background: `conic-gradient(${view.chartStops.stops.join(", ")})`,
              }}
            >
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-lg font-semibold text-[#20352a]">
                  {money(view.periodTotal, 0)}
                </span>
                <span className="text-[10px] text-[#667068]">Total</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {view.categoryTotals
                .filter((item) => item.total > 0)
                .map((item) => (
                  <CategoryLegend
                    key={item.category}
                    category={item.category}
                    total={item.total}
                    percentage={(item.total / view.periodTotal) * 100}
                  />
                ))}
            </div>
          </div>
        ) : (
          <CostsEmpty onAdd={onAddExpense} />
        )}
      </BillsCard>
      <BillsCard>
        <SectionTitle
          title="Recent expenses"
          detail="Select an expense to review or update it"
          action={
            <Link
              href={`${base}/expenses`}
              className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#45604d]"
            >
              View all
            </Link>
          }
        />
        <ExpenseList
          expenses={view.sortedExpenses.slice(0, 5)}
          onEdit={onEditExpense}
          emptyAction={onAddExpense}
        />
      </BillsCard>
    </>
  );
}
