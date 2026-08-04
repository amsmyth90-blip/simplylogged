"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon, type IconName } from "@/components/UiIcon";
import {
  latestMileage,
  type VehicleExpense,
  type VehicleRecord,
} from "@/lib/vehicle-records";

export type VehicleCostView = "overview" | "categories" | "expenses" | "insights";

type Period = "month" | "year" | "all";
type ExpenseCategory = VehicleExpense["category"];

const categories: ExpenseCategory[] = [
  "Service",
  "Fuel",
  "Insurance",
  "Tax",
  "Repair",
  "Breakdown",
  "Tyres",
  "Parking",
  "Other",
];

const categoryStyle: Record<ExpenseCategory, { colour: string; soft: string; icon: IconName; label: string }> = {
  Service: { colour: "#17643c", soft: "#e8f2e9", icon: "gear", label: "Servicing" },
  Fuel: { colour: "#e5a91d", soft: "#fff4d8", icon: "file", label: "Fuel" },
  Insurance: { colour: "#6e57c7", soft: "#eeeafd", icon: "shield", label: "Insurance" },
  Tax: { colour: "#3c82c9", soft: "#e7f1fb", icon: "file", label: "Road tax" },
  Repair: { colour: "#d45b43", soft: "#fbe9e4", icon: "gear", label: "Repairs" },
  Breakdown: { colour: "#c8882a", soft: "#f8eedc", icon: "car", label: "Breakdown cover" },
  Tyres: { colour: "#323b36", soft: "#e9ebe9", icon: "gear", label: "Tyres" },
  Parking: { colour: "#7656c2", soft: "#eeeafd", icon: "map-pin", label: "Parking" },
  Other: { colour: "#9aa09b", soft: "#eef0ee", icon: "archive", label: "Other" },
};

function money(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function shortDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function monthLabel(key: string) {
  const date = new Date(`${key}-01T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

function expenseInPeriod(expense: VehicleExpense, period: Period) {
  if (period === "all") return true;
  const date = new Date(`${expense.date}T12:00:00`);
  const now = new Date();
  if (period === "year") return date.getFullYear() === now.getFullYear();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function expenseCsv(expenses: VehicleExpense[]) {
  const quote = (value: string | number | boolean | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = expenses.map((expense) => [
    expense.date,
    expense.category,
    expense.title,
    expense.provider,
    expense.amount.toFixed(2),
    expense.mileage,
    expense.paymentMethod,
    expense.recurring ? "Yes" : "No",
    expense.notes,
  ].map(quote).join(","));
  return ["Date,Category,Title,Provider,Amount GBP,Mileage,Payment method,Recurring,Notes", ...rows].join("\r\n");
}

export function VehicleCostsPanel({
  vehicle,
  view,
  onAddExpense,
  onEditExpense,
}: {
  vehicle: VehicleRecord;
  view: VehicleCostView;
  onAddExpense: () => void;
  onEditExpense: (expense: VehicleExpense) => void;
}) {
  const [period, setPeriod] = useState<Period>("year");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "All">("All");
  const [newestFirst, setNewestFirst] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mileage = latestMileage(vehicle)?.mileage ?? null;
  const sortedExpenses = useMemo(
    () => [...vehicle.expenses].sort((a, b) => newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)),
    [newestFirst, vehicle.expenses],
  );
  const periodExpenses = sortedExpenses.filter((expense) => expenseInPeriod(expense, period));
  const displayedExpenses = (view === "expenses" ? sortedExpenses : periodExpenses).filter((expense) => categoryFilter === "All" || expense.category === categoryFilter);
  const periodTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = categories.map((category) => ({
    category,
    total: periodExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const firstExpense = [...periodExpenses].sort((a, b) => a.date.localeCompare(b.date))[0];
  const activeMonths = firstExpense
    ? Math.max(1, ((new Date().getFullYear() - new Date(`${firstExpense.date}T12:00:00`).getFullYear()) * 12) + new Date().getMonth() - new Date(`${firstExpense.date}T12:00:00`).getMonth() + 1)
    : 0;
  const averagePerMonth = activeMonths ? periodTotal / activeMonths : 0;
  const costPerMile = mileage && mileage > 0 ? (periodTotal / mileage) * 100 : null;
  const chartStops = categoryTotals.reduce<{ stops: string[]; cursor: number }>((result, item) => {
    if (!periodTotal || !item.total) return result;
    const next = result.cursor + (item.total / periodTotal) * 100;
    result.stops.push(`${categoryStyle[item.category].colour} ${result.cursor}% ${next}%`);
    result.cursor = next;
    return result;
  }, { stops: [], cursor: 0 });
  const monthlyTotals = Array.from(vehicle.expenses.reduce((months, expense) => {
    const key = expense.date.slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + expense.amount);
    return months;
  }, new Map<string, number>())).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  const monthlyMaximum = Math.max(...monthlyTotals.map(([, total]) => total), 1);
  const highestCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];
  const currentYear = new Date().getFullYear();
  const currentYearTotal = vehicle.expenses.filter((expense) => Number(expense.date.slice(0, 4)) === currentYear).reduce((sum, expense) => sum + expense.amount, 0);
  const previousYearTotal = vehicle.expenses.filter((expense) => Number(expense.date.slice(0, 4)) === currentYear - 1).reduce((sum, expense) => sum + expense.amount, 0);

  const downloadCsv = () => {
    const blob = new Blob([expenseCsv(displayedExpenses)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${vehicle.id}-vehicle-expenses.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const base = `/garage/vehicles/${vehicle.id}/costs`;
  const costTabs: { id: VehicleCostView | "receipts"; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: base },
    { id: "categories", label: "Categories", href: `${base}/categories` },
    { id: "expenses", label: "Expenses", href: `${base}/expenses` },
    { id: "receipts", label: "Receipts", href: `${base}/receipts` },
    { id: "insights", label: "Insights", href: `${base}/insights` },
  ];

  return (
    <div className="space-y-4">
      <nav aria-label="Cost views" className="overflow-x-auto rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm">
        <div className="grid grid-cols-5 gap-1">
          {costTabs.map((item) => <Link key={item.id} href={item.href} aria-current={view === item.id ? "page" : undefined} className={`flex min-h-11 min-w-0 items-center justify-center rounded-[12px] px-0.5 text-[8px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:px-2 sm:text-[10px] ${view === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}>{item.label}</Link>)}
        </div>
      </nav>

      {view === "overview" ? <>
        <PeriodSelector value={period} onChange={setPeriod} />
        <div className="grid grid-cols-3 gap-2.5">
          <Metric label="Total spent" value={money(periodTotal)} helper={period === "all" ? "All recorded expenses" : period === "year" ? "This year" : "This month"} />
          <Metric label="Avg. per month" value={money(averagePerMonth)} helper={activeMonths ? `${activeMonths} recorded month${activeMonths === 1 ? "" : "s"}` : "No expense history"} />
          <Metric label="Cost per mile" value={costPerMile === null ? "Add mileage" : `${costPerMile.toFixed(1)}p`} helper={mileage ? `Based on ${mileage.toLocaleString("en-GB")} miles` : "Mileage is required"} />
        </div>
        <BillsCard>
          <SectionTitle title="Spend by category" detail="Based only on expenses recorded in DiaryDock" />
          {periodTotal ? <div className="mt-5 grid items-center gap-6 sm:grid-cols-[180px_1fr]">
            <div className="relative mx-auto h-40 w-40 rounded-full" style={{ background: `conic-gradient(${chartStops.stops.join(", ")})` }}><div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white"><span className="text-lg font-semibold text-[#20352a]">{money(periodTotal, 0)}</span><span className="text-[10px] text-[#667068]">Total</span></div></div>
            <div className="space-y-2.5">{categoryTotals.filter((item) => item.total > 0).map((item) => <CategoryLegend key={item.category} category={item.category} total={item.total} percentage={(item.total / periodTotal) * 100} />)}</div>
          </div> : <CostsEmpty onAdd={onAddExpense} />}
        </BillsCard>
        <BillsCard>
          <SectionTitle title="Recent expenses" detail="Select an expense to review or update it" action={<Link href={`${base}/expenses`} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#45604d]">View all</Link>} />
          <ExpenseList expenses={sortedExpenses.slice(0, 5)} onEdit={onEditExpense} emptyAction={onAddExpense} />
        </BillsCard>
      </> : null}

      {view === "categories" ? <>
        <PeriodSelector value={period} onChange={setPeriod} />
        <BillsCard>
          <SectionTitle title="Category breakdown" detail="Where your recorded vehicle spending goes" />
          <div className="mt-5 space-y-2.5">{categoryTotals.map((item) => <div key={item.category} className="flex min-h-[72px] w-full items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><CategoryIcon category={item.category} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-[#20352a]">{categoryStyle[item.category].label}</span><span className="text-[12px] font-semibold text-[#20352a]">{money(item.total)}</span></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e7e8e2]"><span className="block h-full rounded-full" style={{ width: `${periodTotal ? (item.total / periodTotal) * 100 : 0}%`, backgroundColor: categoryStyle[item.category].colour }} /></span></span><span className="w-10 text-right text-[10px] font-semibold text-[#667068]">{periodTotal ? Math.round((item.total / periodTotal) * 100) : 0}%</span></div>)}</div>
        </BillsCard>
        <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">These figures are your recorded DiaryDock expenses. They do not include costs paid outside the app, or service and insurance records unless you add or link them as an expense.</p>
      </> : null}

      {view === "expenses" ? <>
        <BillsCard>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="search" className="h-4 w-4" />Filter</button>
            <button type="button" onClick={() => setNewestFirst((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="chart" className="h-4 w-4" />{newestFirst ? "Newest" : "Oldest"}</button>
          </div>
          {filtersOpen ? <div className="mt-3 flex gap-2 overflow-x-auto border-t border-[#20352a]/[0.06] pt-3">{(["All", ...categories] as const).map((category) => <button key={category} type="button" onClick={() => setCategoryFilter(category)} className={`min-h-11 shrink-0 rounded-full px-3 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${categoryFilter === category ? "bg-[#355540] text-white" : "bg-[#eef2e9] text-[#52705a]"}`}>{category === "All" ? category : categoryStyle[category].label}</button>)}</div> : null}
        </BillsCard>
        <GroupedExpenseList expenses={displayedExpenses} onEdit={onEditExpense} onAdd={onAddExpense} />
        <button type="button" onClick={onAddExpense} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="plus" className="h-4 w-4" />Add expense</button>
      </> : null}

      {view === "insights" ? <>
        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Monthly average" value={money(averagePerMonth)} helper="Across recorded months" />
          <Metric label="Largest category" value={highestCategory?.total ? categoryStyle[highestCategory.category].label : "No data"} helper={highestCategory?.total ? money(highestCategory.total) : "Add expenses to compare"} />
        </div>
        <BillsCard>
          <SectionTitle title="12-month spending trend" detail="Monthly totals from your recorded expenses" />
          {monthlyTotals.length ? <div className="mt-6 flex h-48 items-end gap-2" aria-label="Monthly spending chart">{monthlyTotals.map(([month, total]) => <div key={month} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-[9px] font-semibold text-[#45604d]">{money(total, 0)}</span><span className="w-full rounded-t-[8px] bg-[#6f8e72]" style={{ height: `${Math.max(8, (total / monthlyMaximum) * 130)}px` }} /><span className="text-[8px] uppercase text-[#667068]">{month.slice(5)}</span></div>)}</div> : <CostsEmpty onAdd={onAddExpense} />}
        </BillsCard>
        <BillsCard><SectionTitle title="Year comparison" detail="A simple comparison of recorded spending" /><dl className="mt-4"><ComparisonRow label={String(currentYear)} value={money(currentYearTotal)} /><ComparisonRow label={String(currentYear - 1)} value={money(previousYearTotal)} /><ComparisonRow label="Change" value={previousYearTotal ? `${(((currentYearTotal - previousYearTotal) / previousYearTotal) * 100).toFixed(1)}%` : "Not enough history"} /></dl></BillsCard>
        <div className="grid grid-cols-2 gap-2.5"><button type="button" onClick={downloadCsv} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/30 bg-white px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="share" className="h-4 w-4" />Export CSV</button><button type="button" onClick={() => window.print()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/30 bg-white px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="file" className="h-4 w-4" />Print / save PDF</button></div>
      </> : null}
    </div>
  );
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  return <div className="grid grid-cols-3 gap-1 rounded-[16px] border border-[#20352a]/[0.06] bg-white p-1">{([['month', 'This month'], ['year', 'This year'], ['all', 'All time']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id} className={`min-h-11 rounded-[12px] px-2 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${value === id ? "bg-[#eef2e9] text-[#315d45]" : "text-[#667068]"}`}>{label}</button>)}</div>;
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <BillsCard className="!p-3"><p className="text-[9px] font-semibold text-[#667068]">{label}</p><p className="mt-2 break-words text-[15px] font-semibold text-[#20352a] sm:text-lg">{value}</p><p className="mt-1 text-[8px] leading-4 text-[#667068] sm:text-[9px]">{helper}</p></BillsCard>;
}

function SectionTitle({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-semibold text-[#20352a]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>{action}</div>;
}

function CategoryIcon({ category }: { category: ExpenseCategory }) {
  const style = categoryStyle[category];
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: style.soft, color: style.colour }}><UiIcon name={style.icon} className="h-5 w-5" /></span>;
}

function CategoryLegend({ category, total, percentage }: { category: ExpenseCategory; total: number; percentage: number }) {
  const style = categoryStyle[category];
  return <div className="flex items-center gap-2 text-[10px]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.colour }} /><span className="min-w-0 flex-1 font-semibold text-[#20352a]">{style.label}</span><span className="font-semibold text-[#20352a]">{money(total)}</span><span className="w-9 text-right text-[#667068]">{Math.round(percentage)}%</span></div>;
}

function ExpenseList({ expenses, onEdit, emptyAction }: { expenses: VehicleExpense[]; onEdit: (expense: VehicleExpense) => void; emptyAction: () => void }) {
  if (!expenses.length) return <CostsEmpty onAdd={emptyAction} />;
  return <div className="mt-4 space-y-2">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} />)}</div>;
}

function GroupedExpenseList({ expenses, onEdit, onAdd }: { expenses: VehicleExpense[]; onEdit: (expense: VehicleExpense) => void; onAdd: () => void }) {
  if (!expenses.length) return <BillsCard><CostsEmpty onAdd={onAdd} /></BillsCard>;
  const groups = Array.from(expenses.reduce((result, expense) => {
    const key = expense.date.slice(0, 7);
    const current = result.get(key) ?? [];
    current.push(expense);
    result.set(key, current);
    return result;
  }, new Map<string, VehicleExpense[]>()));
  return <div className="space-y-4">{groups.map(([month, entries]) => <section key={month}><div className="mb-2 flex items-center justify-between px-1"><h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#315d45]">{monthLabel(month)}</h2><span className="text-[11px] font-semibold text-[#315d45]">{money(entries.reduce((sum, expense) => sum + expense.amount, 0))}</span></div><BillsCard className="!p-2"><div className="space-y-1">{entries.map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} />)}</div></BillsCard></section>)}</div>;
}

function ExpenseRow({ expense, onEdit }: { expense: VehicleExpense; onEdit: (expense: VehicleExpense) => void }) {
  return <button type="button" onClick={() => onEdit(expense)} className="flex min-h-[72px] w-full items-center gap-3 rounded-[16px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3 py-2 text-left transition hover:bg-[#f4f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><CategoryIcon category={expense.category} /><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#20352a]">{expense.title}</span><span className="mt-1 block truncate text-[10px] text-[#667068]">{shortDate(expense.date)}{expense.provider ? ` · ${expense.provider}` : ""}{expense.mileage ? ` · ${expense.mileage.toLocaleString("en-GB")} miles` : ""}</span></span><span className="text-[12px] font-semibold text-[#20352a]">{money(expense.amount)}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></button>;
}

function CostsEmpty({ onAdd }: { onAdd: () => void }) {
  return <div className="mt-4 rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-7 text-center"><UiIcon name="chart" className="mx-auto h-7 w-7 text-[#6f8e72]" /><p className="mt-3 text-sm font-semibold text-[#20352a]">No expenses in this view</p><p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[#667068]">Add costs as they occur to build a reliable running history.</p><button type="button" onClick={onAdd} className="mt-4 min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Add expense</button></div>;
}

function ComparisonRow({ label, value }: { label: string; value: string }) {
  return <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2 last:border-0"><dt className="text-xs text-[#667068]">{label}</dt><dd className="text-xs font-semibold text-[#20352a]">{value}</dd></div>;
}
