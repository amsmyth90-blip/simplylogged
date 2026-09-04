import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import type { VehicleExpense } from "@/lib/vehicle-records";

import { categories, categoryStyle, money } from "./vehicle-cost-model";
import {
  CategoryIcon,
  GroupedExpenseList,
  PeriodSelector,
  SectionTitle,
} from "./VehicleCostUi";
import type { VehicleCostsViewModel } from "./useVehicleCosts";

export function VehicleCostCategories({
  view,
}: {
  view: VehicleCostsViewModel;
}) {
  return (
    <>
      <PeriodSelector value={view.period} onChange={view.setPeriod} />
      <BillsCard>
        <SectionTitle
          title="Category breakdown"
          detail="Where your recorded vehicle spending goes"
        />
        <div className="mt-5 space-y-2.5">
          {view.categoryTotals.map((item) => (
            <div
              key={item.category}
              className="flex min-h-[72px] w-full items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
            >
              <CategoryIcon category={item.category} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold text-[#20352a]">
                    {categoryStyle[item.category].label}
                  </span>
                  <span className="text-[12px] font-semibold text-[#20352a]">
                    {money(item.total)}
                  </span>
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e7e8e2]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${view.periodTotal ? (item.total / view.periodTotal) * 100 : 0}%`,
                      backgroundColor: categoryStyle[item.category].colour,
                    }}
                  />
                </span>
              </span>
              <span className="w-10 text-right text-[10px] font-semibold text-[#667068]">
                {view.periodTotal
                  ? Math.round((item.total / view.periodTotal) * 100)
                  : 0}
                %
              </span>
            </div>
          ))}
        </div>
      </BillsCard>
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
        These figures are your recorded DiaryDock expenses. They do not include
        costs paid outside the app, or service and insurance records unless you
        add or link them as an expense.
      </p>
    </>
  );
}

export function VehicleExpenseHistory({
  view,
  onAddExpense,
  onEditExpense,
}: {
  view: VehicleCostsViewModel;
  onAddExpense: () => void;
  onEditExpense: (expense: VehicleExpense) => void;
}) {
  return (
    <>
      <BillsCard>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => view.setFiltersOpen((open) => !open)}
            aria-expanded={view.filtersOpen}
            className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <UiIcon name="search" className="h-4 w-4" /> Filter
          </button>
          <button
            type="button"
            onClick={() => view.setNewestFirst((current) => !current)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <UiIcon name="chart" className="h-4 w-4" />
            {view.newestFirst ? "Newest" : "Oldest"}
          </button>
        </div>
        {view.filtersOpen ? (
          <div className="mt-3 flex gap-2 overflow-x-auto border-t border-[#20352a]/[0.06] pt-3">
            {(["All", ...categories] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => view.setCategoryFilter(category)}
                className={`min-h-11 shrink-0 rounded-full px-3 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${view.categoryFilter === category ? "bg-[#355540] text-white" : "bg-[#eef2e9] text-[#52705a]"}`}
              >
                {category === "All" ? category : categoryStyle[category].label}
              </button>
            ))}
          </div>
        ) : null}
      </BillsCard>
      <GroupedExpenseList
        expenses={view.displayedExpenses}
        onEdit={onEditExpense}
        onAdd={onAddExpense}
      />
      <button
        type="button"
        onClick={onAddExpense}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
      >
        <UiIcon name="plus" className="h-4 w-4" /> Add expense
      </button>
    </>
  );
}
