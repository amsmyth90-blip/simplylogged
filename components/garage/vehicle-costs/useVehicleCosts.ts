"use client";

import { useMemo, useState } from "react";

import { latestMileage, type VehicleRecord } from "@/lib/vehicle-records";

import {
  categories,
  categoryStyle,
  expenseCsv,
  expenseInPeriod,
  type ExpenseCategory,
  type Period,
  type VehicleCostView,
} from "./vehicle-cost-model";

export function useVehicleCosts(vehicle: VehicleRecord, view: VehicleCostView) {
  const [period, setPeriod] = useState<Period>("year");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "All">(
    "All",
  );
  const [newestFirst, setNewestFirst] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mileage = latestMileage(vehicle)?.mileage ?? null;
  const sortedExpenses = useMemo(
    () =>
      [...vehicle.expenses].sort((a, b) =>
        newestFirst
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date),
      ),
    [newestFirst, vehicle.expenses],
  );
  const periodExpenses = sortedExpenses.filter((expense) =>
    expenseInPeriod(expense, period),
  );
  const displayedExpenses = (
    view === "expenses" ? sortedExpenses : periodExpenses
  ).filter(
    (expense) =>
      categoryFilter === "All" || expense.category === categoryFilter,
  );
  const periodTotal = periodExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const categoryTotals = categories.map((category) => ({
    category,
    total: periodExpenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const firstExpense = [...periodExpenses].sort((a, b) =>
    a.date.localeCompare(b.date),
  )[0];
  const activeMonths = firstExpense
    ? Math.max(
        1,
        (new Date().getFullYear() -
          new Date(`${firstExpense.date}T12:00:00`).getFullYear()) *
          12 +
          new Date().getMonth() -
          new Date(`${firstExpense.date}T12:00:00`).getMonth() +
          1,
      )
    : 0;
  const averagePerMonth = activeMonths ? periodTotal / activeMonths : 0;
  const costPerMile =
    mileage && mileage > 0 ? (periodTotal / mileage) * 100 : null;
  const chartStops = categoryTotals.reduce<{ stops: string[]; cursor: number }>(
    (result, item) => {
      if (!periodTotal || !item.total) return result;
      const next = result.cursor + (item.total / periodTotal) * 100;
      result.stops.push(
        `${categoryStyle[item.category].colour} ${result.cursor}% ${next}%`,
      );
      result.cursor = next;
      return result;
    },
    { stops: [], cursor: 0 },
  );
  const monthlyTotals = Array.from(
    vehicle.expenses.reduce((months, expense) => {
      const key = expense.date.slice(0, 7);
      months.set(key, (months.get(key) ?? 0) + expense.amount);
      return months;
    }, new Map<string, number>()),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);
  const monthlyMaximum = Math.max(
    ...monthlyTotals.map(([, total]) => total),
    1,
  );
  const highestCategory = [...categoryTotals].sort(
    (a, b) => b.total - a.total,
  )[0];
  const currentYear = new Date().getFullYear();
  const totalForYear = (year: number) =>
    vehicle.expenses
      .filter((expense) => Number(expense.date.slice(0, 4)) === year)
      .reduce((sum, expense) => sum + expense.amount, 0);
  const currentYearTotal = totalForYear(currentYear);
  const previousYearTotal = totalForYear(currentYear - 1);

  const downloadCsv = () => {
    const blob = new Blob([expenseCsv(displayedExpenses)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${vehicle.id}-vehicle-expenses.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return {
    vehicle,
    view,
    period,
    setPeriod,
    categoryFilter,
    setCategoryFilter,
    newestFirst,
    setNewestFirst,
    filtersOpen,
    setFiltersOpen,
    mileage,
    sortedExpenses,
    displayedExpenses,
    periodTotal,
    categoryTotals,
    activeMonths,
    averagePerMonth,
    costPerMile,
    chartStops,
    monthlyTotals,
    monthlyMaximum,
    highestCategory,
    currentYear,
    currentYearTotal,
    previousYearTotal,
    downloadCsv,
  };
}

export type VehicleCostsViewModel = ReturnType<typeof useVehicleCosts>;
