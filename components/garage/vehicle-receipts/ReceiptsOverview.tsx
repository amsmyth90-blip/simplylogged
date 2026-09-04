import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import { categoryColours, money, receiptCategories } from "./receipt-model";
import {
  ReceiptEmpty,
  ReceiptMetric,
  ReceiptRow,
  ReceiptSectionTitle,
  ReceiptShell,
} from "./ReceiptShell";

export function ReceiptsOverview({
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
  const now = new Date();
  const yearReceipts = receipts.filter(
    (expense) => Number(expense.date.slice(0, 4)) === now.getFullYear(),
  );
  const monthReceipts = yearReceipts.filter(
    (expense) => Number(expense.date.slice(5, 7)) === now.getMonth() + 1,
  );
  const yearTotal = yearReceipts.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const activeMonths = new Set(
    yearReceipts.map((expense) => expense.date.slice(0, 7)),
  ).size;
  const averageMonth = activeMonths ? yearTotal / activeMonths : 0;
  const categoryTotals = receiptCategories
    .map((category) => ({
      category,
      total: yearReceipts
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <ReceiptShell
      vehicle={vehicle}
      name={name}
      mileage={mileage}
      title="Receipts"
      backHref={`/garage/vehicles/${vehicle.id}/costs`}
      action={
        <Link
          href={`${base}/new`}
          className="flex min-h-11 items-center rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45]"
        >
          + Add Receipt
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ReceiptMetric
          label="Total receipts"
          value={money(yearTotal)}
          helper="This year"
        />
        <ReceiptMetric
          label="Average per month"
          value={money(averageMonth)}
          helper={
            activeMonths
              ? `${activeMonths} recorded month${activeMonths === 1 ? "" : "s"}`
              : "No receipt history"
          }
        />
      </div>
      <BillsCard>
        <ReceiptSectionTitle
          title="Top categories this year"
          detail="Only expenses with an attached receipt are included"
        />
        {categoryTotals.length ? (
          <div className="mt-4 space-y-3">
            {categoryTotals.slice(0, 6).map((item) => (
              <div key={item.category} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: categoryColours[item.category] }}
                />
                <span className="flex-1 text-xs font-semibold text-[#20352a]">
                  {item.category}
                </span>
                <span className="text-xs font-semibold text-[#20352a]">
                  {money(item.total)}
                </span>
                <span className="w-9 text-right text-[10px] text-[#667068]">
                  {yearTotal ? Math.round((item.total / yearTotal) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <ReceiptEmpty
              title="No receipt totals yet"
              detail="Add a receipt to begin the summary."
            />
          </div>
        )}
      </BillsCard>
      <BillsCard>
        <ReceiptSectionTitle
          title="Recent receipts"
          detail={`${monthReceipts.length} added this month`}
          action={
            <Link
              href={`${base}/all`}
              className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#45604d]"
            >
              View all
            </Link>
          }
        />
        <div className="mt-4 space-y-2">
          {[...receipts]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((expense) => (
              <ReceiptRow
                key={expense.id}
                expense={expense}
                href={`${base}/${expense.id}`}
              />
            ))}
          {!receipts.length ? (
            <ReceiptEmpty
              title="No receipts saved"
              detail="Take a photo or choose a file to add your first vehicle receipt."
            />
          ) : null}
        </div>
      </BillsCard>
      <Link
        href={`${base}/all`}
        className="flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white"
      >
        View all receipts
      </Link>
    </ReceiptShell>
  );
}
