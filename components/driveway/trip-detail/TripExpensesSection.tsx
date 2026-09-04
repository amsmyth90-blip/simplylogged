"use client";
import { UiIcon } from "@/components/UiIcon";
import {
  EmptySection,
  formatTripMoney,
  SectionHeading,
} from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";
export function TripExpensesSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { trip, setAddMode } = controller;
  if (!trip) return null;
  const totals = [
    {
      label: "Estimated",
      value: trip.expenses
        .filter((item) => item.status === "estimated")
        .reduce((sum, item) => sum + item.amount, 0),
    },
    {
      label: "Unpaid",
      value: trip.expenses
        .filter((item) => item.status === "unpaid")
        .reduce((sum, item) => sum + item.amount, 0),
    },
    {
      label: "Paid",
      value: trip.expenses
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + item.amount, 0),
    },
  ];
  return (
    <section>
      <SectionHeading
        title="Expenses & budget"
        detail="A lightweight trip estimate. Booking costs are not duplicated here."
        action={
          <button
            type="button"
            onClick={() => setAddMode("expense")}
            className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
          >
            + Add expense
          </button>
        }
      />
      <div className="mt-5 grid grid-cols-3 gap-2">
        {totals.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-white/90 p-3 text-center"
          >
            <p className="text-sm font-bold">
              {formatTripMoney(item.value, trip.currency)}
            </p>
            <p className="mt-1 text-[9px] uppercase text-[#667068]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
      {trip.expenses.length ? (
        <div className="mt-4 space-y-2">
          {trip.expenses.map((expense) => (
            <article
              key={expense.id}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#20352a]/[0.07] bg-white/90 px-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
                <UiIcon name="chart" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {expense.title}
                </span>
                <span className="text-[10px] text-[#667068]">
                  {expense.category} · {expense.status}
                </span>
              </span>
              <strong className="text-sm">
                {formatTripMoney(expense.amount, expense.currency)}
              </strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptySection
            icon="chart"
            title="No optional expenses"
            detail="Add only costs not already recorded on a booking."
          />
        </div>
      )}
    </section>
  );
}
