import Link from "next/link";
import { useMemo, useState } from "react";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import {
  type ExpenseCategory,
  money,
  monthLabel,
  receiptCategories,
} from "./receipt-model";
import { ReceiptEmpty, ReceiptRow, ReceiptShell } from "./ReceiptShell";

export function AllReceiptsView({
  vehicle,
  name,
  mileage,
  base,
  receipts,
}: {
  vehicle: VehicleRecord;
  name: string;
  mileage: number | null;
  base: string;
  receipts: VehicleExpense[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "All">("All");
  const [newestFirst, setNewestFirst] = useState(true);
  const groups = useMemo(
    () => groupReceipts(receipts, search, category, newestFirst),
    [category, newestFirst, receipts, search],
  );

  return (
    <ReceiptShell
      vehicle={vehicle}
      name={name}
      mileage={mileage}
      title="All Receipts"
      backHref={base}
      action={
        <Link
          href={`${base}/new`}
          className="flex min-h-11 items-center rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45]"
        >
          + Add
        </Link>
      }
    >
      <BillsCard>
        <label className="relative block">
          <UiIcon
            name="search"
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#667068]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search receipts"
            className={`${fieldClass} !mt-0 pl-10`}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[#667068]">
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ExpenseCategory | "All")
              }
              className={fieldClass}
            >
              <option value="All">All categories</option>
              {receiptCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setNewestFirst((value) => !value)}
            className="mt-[18px] min-h-11 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] text-xs font-semibold text-[#45604d]"
          >
            {newestFirst ? "Newest first" : "Oldest first"}
          </button>
        </div>
      </BillsCard>
      {groups.length ? (
        <div className="space-y-4">
          {groups.map(([month, expenses]) => (
            <section key={month}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#315d45]">
                  {monthLabel(month)}
                </h2>
                <span className="text-[11px] font-semibold text-[#315d45]">
                  {money(
                    expenses.reduce((sum, expense) => sum + expense.amount, 0),
                  )}
                </span>
              </div>
              <BillsCard className="!p-2">
                <div className="space-y-1">
                  {expenses.map((expense) => (
                    <ReceiptRow
                      key={expense.id}
                      expense={expense}
                      href={`${base}/${expense.id}`}
                    />
                  ))}
                </div>
              </BillsCard>
            </section>
          ))}
        </div>
      ) : (
        <BillsCard>
          <ReceiptEmpty
            title="No matching receipts"
            detail="Change the search or category, or add a new receipt."
          />
        </BillsCard>
      )}
      <Link
        href={`${base}/new`}
        className="flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add receipt
      </Link>
    </ReceiptShell>
  );
}

function groupReceipts(
  receipts: VehicleExpense[],
  search: string,
  category: ExpenseCategory | "All",
  newestFirst: boolean,
) {
  const query = search.trim().toLowerCase();
  const filtered = [...receipts]
    .filter((expense) => category === "All" || expense.category === category)
    .filter((expense) =>
      `${expense.title} ${expense.provider} ${expense.receiptNumber ?? ""}`
        .toLowerCase()
        .includes(query),
    )
    .sort((a, b) =>
      newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
  const groups = filtered.reduce((map, expense) => {
    const key = expense.date.slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), expense]);
    return map;
  }, new Map<string, VehicleExpense[]>());
  return Array.from(groups).sort(([a], [b]) =>
    newestFirst ? b.localeCompare(a) : a.localeCompare(b),
  );
}
