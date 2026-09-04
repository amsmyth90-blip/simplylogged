import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import {
  effectiveBillStatus,
  formatBillDate,
  formatMoney,
  type BillRecord,
  type BillStatus,
} from "@/lib/bill-records";

const statusTone: Record<BillStatus, string> = {
  active: "bg-[#e6efe1] text-[#45604d]",
  cancelled: "bg-[#ececec] text-[#6d716e]",
  draft: "bg-[#f1eee5] text-[#806b45]",
  overdue: "bg-[#f7e4df] text-[#9a4f43]",
  paid: "bg-[#e7eee8] text-[#52705a]",
};

function iconFor(bill: BillRecord) {
  if (bill.category === "Utilities") return "sun";
  if (bill.category === "Council tax") return "home";
  if (bill.category === "Communications") return "phone";
  return "file";
}

export function BillRow({ bill }: { bill: BillRecord }) {
  const status = effectiveBillStatus(bill);
  return (
    <Link
      href={`/office/bills/${bill.id}`}
      className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={iconFor(bill)} className="h-[19px] w-[19px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {bill.title || bill.provider || "Bill awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {bill.provider || "Provider not confirmed"} ·{" "}
          {formatBillDate(bill.dueDate)}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-[#20352a]">
          {formatMoney(bill.amount)}
        </span>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${statusTone[status]}`}
        >
          {bill.reviewStatus === "needs-review" ? "Check details" : status}
        </span>
      </span>
    </Link>
  );
}
