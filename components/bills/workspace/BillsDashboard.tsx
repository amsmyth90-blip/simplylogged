import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsNotice,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { BillRow } from "@/components/bills/workspace/bill-shared";
import {
  effectiveBillStatus,
  formatMoney,
  type BillRecord,
} from "@/lib/bill-records";
import { dateTime, daysUntil } from "@/lib/presentation";

function isThisMonth(bill: BillRecord, now: Date) {
  if (!bill.dueDate) return false;
  const due = new Date(`${bill.dueDate}T12:00:00`);
  return (
    due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear()
  );
}

function Overview({
  dueSoon,
  month,
  overdue,
  paid,
}: {
  dueSoon: BillRecord[];
  month: BillRecord[];
  overdue: BillRecord[];
  paid: BillRecord[];
}) {
  const tile = (label: string, bills: BillRecord[]) => (
    <div className="rounded-[16px] bg-white/10 p-3">
      <p className="text-2xl font-semibold">{bills.length}</p>
      <p className="text-[11px] text-white/70">
        {label} ·{" "}
        {formatMoney(bills.reduce((sum, bill) => sum + bill.amount, 0))}
      </p>
    </div>
  );
  return (
    <BillsCard className="overflow-hidden bg-[#355540] text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
            Overview
          </p>
          <h2 className="mt-1 text-xl font-semibold">Your household bills</h2>
        </div>
        <UiIcon name="bell" className="h-5 w-5 text-white/75" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {tile("Due soon", dueSoon)}
        {tile("This month", month)}
        {tile("Paid", paid)}
        {tile("Overdue", overdue)}
      </div>
    </BillsCard>
  );
}

export function BillsDashboard() {
  const { state, hydrated } = useDiaryDockData();
  const reviewed = state.bills.bills.filter(
    (bill) => bill.reviewStatus === "reviewed",
  );
  const inbox = state.bills.bills.filter(
    (bill) => bill.reviewStatus === "needs-review",
  );
  const active = reviewed.filter(
    (bill) => effectiveBillStatus(bill) === "active",
  );
  const dueSoon = active.filter(
    (bill) => daysUntil(bill.dueDate) >= 0 && daysUntil(bill.dueDate) <= 14,
  );
  const overdue = reviewed.filter(
    (bill) => effectiveBillStatus(bill) === "overdue",
  );
  const paid = reviewed.filter((bill) => effectiveBillStatus(bill) === "paid");
  const month = reviewed.filter((bill) => isThisMonth(bill, new Date()));
  const recent = [...reviewed]
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate))
    .slice(0, 3);

  if (!hydrated) {
    return (
      <BillsShell>
        <div className="rounded-[28px] bg-white/70 p-8 text-sm text-[#667068]">
          Opening your bills…
        </div>
      </BillsShell>
    );
  }

  return (
    <BillsShell>
      <BillsHeader
        title="Bills"
        subtitle="Stay on top of household bills, due dates and payments without mixing them with the rest of your financial records."
      />
      <Overview dueSoon={dueSoon} month={month} overdue={overdue} paid={paid} />
      <BillsCard>
        <div className="flex items-center justify-between gap-3">
          <BillsSectionTitle
            icon="calendar"
            title="Expected this month"
            detail="Based only on bills you have reviewed"
          />
          <span className="text-xl font-semibold text-[#20352a]">
            {formatMoney(month.reduce((sum, bill) => sum + bill.amount, 0))}
          </span>
        </div>
        <Link
          href="/office/bills/calendar"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#6f8e72]/35 px-4 text-sm font-semibold text-[#45604d]"
        >
          View calendar
        </Link>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between">
          <BillsSectionTitle
            icon="file"
            title="Recently added"
            detail={
              recent.length
                ? "Your next bills at a glance"
                : "No confirmed bills yet"
            }
          />
          <Link
            href="/office/bills/all"
            className="text-xs font-semibold text-[#52705a]"
          >
            See all
          </Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {recent.length ? (
            recent.map((bill) => <BillRow key={bill.id} bill={bill} />)
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-[12px] leading-5 text-[#667068]">
              Upload your first bill or enter its details manually. Nothing is
              counted until you review it.
            </p>
          )}
        </div>
        <Link
          href="/office/bills/new"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add or upload bill
        </Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/bills/all"
          icon="folder"
          title="All your bills"
          detail="Filter and review confirmed bills"
          badge={`${reviewed.length}`}
        />
        <BillsAction
          href="/office/bills/inbox"
          icon="mail"
          title="Document inbox"
          detail="Bills waiting for your review"
          badge={`${inbox.length}`}
        />
        <BillsAction
          href="/office/bills/insights"
          icon="chart"
          title="Spending insights"
          detail="See totals by household category"
        />
        <BillsAction
          href="/office/bills/calendar"
          icon="calendar"
          title="Bill calendar"
          detail="See upcoming dates in one place"
        />
      </div>
      <BillsNotice />
    </BillsShell>
  );
}
