import Link from "next/link";
import { useMemo } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  BillsCard,
  BillsHeader,
  BillsNotice,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import {
  billCategories,
  effectiveBillStatus,
  formatMoney,
  type BillRecord,
} from "@/lib/bill-records";

function priceIncreases(bills: BillRecord[]) {
  return bills.flatMap((bill) => {
    const previous = bill.history.at(-2)?.amount;
    const latest = bill.history.at(-1)?.amount;
    if (!previous || latest === undefined || latest <= previous) return [];
    return [
      {
        bill,
        change: latest - previous,
        percent: Math.round(((latest - previous) / previous) * 100),
      },
    ];
  });
}

export function BillsInsights() {
  const { state } = useDiaryDockData();
  const bills = state.bills.bills.filter(
    (bill) =>
      bill.reviewStatus === "reviewed" &&
      effectiveBillStatus(bill) !== "cancelled",
  );
  const totals = useMemo(
    () =>
      billCategories
        .map((category) => ({
          category,
          total: bills
            .filter((bill) => bill.category === category)
            .reduce((sum, bill) => sum + bill.amount, 0),
        }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total),
    [bills],
  );
  const increases = priceIncreases(bills);
  const grand = totals.reduce((sum, item) => sum + item.total, 0);

  return (
    <BillsShell>
      <BillsHeader
        title="Spending Insights"
        subtitle="A simple category view based on the bill amounts you have confirmed."
        backHref="/office/bills"
      />
      {increases.length ? (
        <BillsCard>
          <BillsSectionTitle
            icon="alert"
            title="Price changes to check"
            detail="Compared with amounts you previously confirmed"
          />
          <div className="mt-4 space-y-2">
            {increases.map(({ bill, change, percent }) => (
              <Link
                key={bill.id}
                href={`/office/bills/${bill.id}`}
                className="flex items-center justify-between rounded-[15px] bg-[#f7e4df] px-3 py-3 text-xs"
              >
                <span className="font-semibold text-[#7f463d]">
                  {bill.title}
                </span>
                <span className="text-[#8c5349]">
                  +{formatMoney(change)} · {percent}%
                </span>
              </Link>
            ))}
          </div>
        </BillsCard>
      ) : null}
      <BillsCard>
        <BillsSectionTitle
          icon="chart"
          title="Bills by category"
          detail={
            bills.length
              ? `${bills.length} confirmed bill${bills.length === 1 ? "" : "s"}`
              : "No confirmed bill data yet"
          }
        />
        <p className="mt-5 text-3xl font-semibold text-[#20352a]">
          {formatMoney(grand)}
        </p>
        <p className="mt-1 text-[11px] text-[#667068]">
          Total of the bill records shown below — not a bank balance or
          forecast.
        </p>
        <div className="mt-5 space-y-4">
          {totals.map(({ category, total }) => (
            <div key={category}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#20352a]">{category}</span>
                <span className="text-[#667068]">{formatMoney(total)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef2e9]">
                <div
                  className="h-full rounded-full bg-[#6f8e72]"
                  style={{
                    width: `${grand ? Math.max(4, (total / grand) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {!totals.length ? (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
              Insights will appear once you confirm your first bill.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <BillsNotice />
    </BillsShell>
  );
}
