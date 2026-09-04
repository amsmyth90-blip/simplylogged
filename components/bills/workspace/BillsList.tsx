import Link from "next/link";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  BillsCard,
  BillsHeader,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { BillRow } from "@/components/bills/workspace/bill-shared";
import { billCategories, effectiveBillStatus } from "@/lib/bill-records";
import { dateTime } from "@/lib/presentation";

const statusFilters = ["All", "Active", "Paid", "Overdue", "Cancelled"];

export function BillsList() {
  const { state } = useDiaryDockData();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [payment, setPayment] = useState("All");
  const normalizedQuery = query.trim().toLowerCase();
  const bills = state.bills.bills
    .filter((bill) => bill.reviewStatus === "reviewed")
    .filter(
      (bill) =>
        filter === "All" || effectiveBillStatus(bill) === filter.toLowerCase(),
    )
    .filter((bill) => category === "All" || bill.category === category)
    .filter(
      (bill) =>
        payment === "All" ||
        (payment === "Direct Debit" ? bill.directDebit : !bill.directDebit),
    )
    .filter((bill) =>
      `${bill.title} ${bill.provider} ${bill.category} ${bill.paymentMethod}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate));

  return (
    <BillsShell>
      <BillsHeader
        title="My Bills"
        subtitle="Search, filter and open your reviewed household bills."
        backHref="/office/bills"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search bills
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Provider, title or category"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold ${filter === item ? "bg-[#355540] text-white" : "bg-[#f0f2e9] text-[#52705a]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              {billCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Payment
            <select
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              <option>Direct Debit</option>
              <option>Other payment</option>
            </select>
          </label>
        </div>
      </BillsCard>
      <div className="space-y-3">
        {bills.length ? (
          bills.map((bill) => <BillRow key={bill.id} bill={bill} />)
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No bills match this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/bills/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add or upload bill
      </Link>
    </BillsShell>
  );
}
