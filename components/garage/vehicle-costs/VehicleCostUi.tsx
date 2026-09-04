import type { ReactNode } from "react";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import type { VehicleExpense } from "@/lib/vehicle-records";

import {
  categoryStyle,
  money,
  monthLabel,
  shortDate,
  type ExpenseCategory,
  type Period,
} from "./vehicle-cost-model";

export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-[16px] border border-[#20352a]/[0.06] bg-white p-1">
      {(
        [
          ["month", "This month"],
          ["year", "This year"],
          ["all", "All time"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`min-h-11 rounded-[12px] px-2 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${value === id ? "bg-[#eef2e9] text-[#315d45]" : "text-[#667068]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <BillsCard className="!p-3">
      <p className="text-[9px] font-semibold text-[#667068]">{label}</p>
      <p className="mt-2 break-words text-[15px] font-semibold text-[#20352a] sm:text-lg">
        {value}
      </p>
      <p className="mt-1 text-[8px] leading-4 text-[#667068] sm:text-[9px]">
        {helper}
      </p>
    </BillsCard>
  );
}

export function SectionTitle({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-[#20352a]">{title}</h2>
        <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export function CategoryIcon({ category }: { category: ExpenseCategory }) {
  const style = categoryStyle[category];
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
      style={{ backgroundColor: style.soft, color: style.colour }}
    >
      <UiIcon name={style.icon} className="h-5 w-5" />
    </span>
  );
}

export function CategoryLegend({
  category,
  total,
  percentage,
}: {
  category: ExpenseCategory;
  total: number;
  percentage: number;
}) {
  const style = categoryStyle[category];
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: style.colour }}
      />
      <span className="min-w-0 flex-1 font-semibold text-[#20352a]">
        {style.label}
      </span>
      <span className="font-semibold text-[#20352a]">{money(total)}</span>
      <span className="w-9 text-right text-[#667068]">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

export function ExpenseList({
  expenses,
  onEdit,
  emptyAction,
}: {
  expenses: VehicleExpense[];
  onEdit: (expense: VehicleExpense) => void;
  emptyAction: () => void;
}) {
  if (!expenses.length) return <CostsEmpty onAdd={emptyAction} />;
  return (
    <div className="mt-4 space-y-2">
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} />
      ))}
    </div>
  );
}

export function GroupedExpenseList({
  expenses,
  onEdit,
  onAdd,
}: {
  expenses: VehicleExpense[];
  onEdit: (expense: VehicleExpense) => void;
  onAdd: () => void;
}) {
  if (!expenses.length)
    return (
      <BillsCard>
        <CostsEmpty onAdd={onAdd} />
      </BillsCard>
    );
  const groups = Array.from(
    expenses.reduce((result, expense) => {
      const key = expense.date.slice(0, 7);
      const current = result.get(key) ?? [];
      current.push(expense);
      result.set(key, current);
      return result;
    }, new Map<string, VehicleExpense[]>()),
  );
  return (
    <div className="space-y-4">
      {groups.map(([month, entries]) => (
        <section key={month}>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#315d45]">
              {monthLabel(month)}
            </h2>
            <span className="text-[11px] font-semibold text-[#315d45]">
              {money(entries.reduce((sum, expense) => sum + expense.amount, 0))}
            </span>
          </div>
          <BillsCard className="!p-2">
            <div className="space-y-1">
              {entries.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </BillsCard>
        </section>
      ))}
    </div>
  );
}

function ExpenseRow({
  expense,
  onEdit,
}: {
  expense: VehicleExpense;
  onEdit: (expense: VehicleExpense) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(expense)}
      className="flex min-h-[72px] w-full items-center gap-3 rounded-[16px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3 py-2 text-left transition hover:bg-[#f4f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
    >
      <CategoryIcon category={expense.category} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-[#20352a]">
          {expense.title}
        </span>
        <span className="mt-1 block truncate text-[10px] text-[#667068]">
          {shortDate(expense.date)}
          {expense.provider ? ` · ${expense.provider}` : ""}
          {expense.mileage
            ? ` · ${expense.mileage.toLocaleString("en-GB")} miles`
            : ""}
        </span>
      </span>
      <span className="text-[12px] font-semibold text-[#20352a]">
        {money(expense.amount)}
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </button>
  );
}

export function CostsEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-4 rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-7 text-center">
      <UiIcon name="chart" className="mx-auto h-7 w-7 text-[#6f8e72]" />
      <p className="mt-3 text-sm font-semibold text-[#20352a]">
        No expenses in this view
      </p>
      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[#667068]">
        Add costs as they occur to build a reliable running history.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        Add expense
      </button>
    </div>
  );
}

export function ComparisonRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2 last:border-0">
      <dt className="text-xs text-[#667068]">{label}</dt>
      <dd className="text-xs font-semibold text-[#20352a]">{value}</dd>
    </div>
  );
}
