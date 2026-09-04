import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { categoryStyle, money } from "./vehicle-cost-model";
import {
  ComparisonRow,
  CostsEmpty,
  Metric,
  SectionTitle,
} from "./VehicleCostUi";
import type { VehicleCostsViewModel } from "./useVehicleCosts";

export function VehicleCostInsights({
  view,
  onAddExpense,
}: {
  view: VehicleCostsViewModel;
  onAddExpense: () => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <Metric
          label="Monthly average"
          value={money(view.averagePerMonth)}
          helper="Across recorded months"
        />
        <Metric
          label="Largest category"
          value={
            view.highestCategory?.total
              ? categoryStyle[view.highestCategory.category].label
              : "No data"
          }
          helper={
            view.highestCategory?.total
              ? money(view.highestCategory.total)
              : "Add expenses to compare"
          }
        />
      </div>
      <BillsCard>
        <SectionTitle
          title="12-month spending trend"
          detail="Monthly totals from your recorded expenses"
        />
        {view.monthlyTotals.length ? (
          <div
            className="mt-6 flex h-48 items-end gap-2"
            aria-label="Monthly spending chart"
          >
            {view.monthlyTotals.map(([month, total]) => (
              <div
                key={month}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span className="text-[9px] font-semibold text-[#45604d]">
                  {money(total, 0)}
                </span>
                <span
                  className="w-full rounded-t-[8px] bg-[#6f8e72]"
                  style={{
                    height: `${Math.max(8, (total / view.monthlyMaximum) * 130)}px`,
                  }}
                />
                <span className="text-[8px] uppercase text-[#667068]">
                  {month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <CostsEmpty onAdd={onAddExpense} />
        )}
      </BillsCard>
      <BillsCard>
        <SectionTitle
          title="Year comparison"
          detail="A simple comparison of recorded spending"
        />
        <dl className="mt-4">
          <ComparisonRow
            label={String(view.currentYear)}
            value={money(view.currentYearTotal)}
          />
          <ComparisonRow
            label={String(view.currentYear - 1)}
            value={money(view.previousYearTotal)}
          />
          <ComparisonRow
            label="Change"
            value={
              view.previousYearTotal
                ? `${(((view.currentYearTotal - view.previousYearTotal) / view.previousYearTotal) * 100).toFixed(1)}%`
                : "Not enough history"
            }
          />
        </dl>
      </BillsCard>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={view.downloadCsv}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/30 bg-white px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="share" className="h-4 w-4" /> Export CSV
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/30 bg-white px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="file" className="h-4 w-4" /> Print / save PDF
        </button>
      </div>
    </>
  );
}
