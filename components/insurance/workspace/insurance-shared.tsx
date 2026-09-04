"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { formatBillDate, formatMoney } from "@/lib/bill-records";
import {
  type ClaimStatus,
  type InsurancePolicy,
  type PolicyStatus,
} from "@/lib/insurance-records";
import { daysUntil as sharedDaysUntil } from "@/lib/presentation";

export type InsuranceView =
  | "dashboard"
  | "policies"
  | "new"
  | "detail"
  | "claims"
  | "compare"
  | "review";

export const policyTone: Record<PolicyStatus, string> = {
  draft: "bg-[#f1eee5] text-[#806b45]",
  active: "bg-[#e6efe1] text-[#45604d]",
  expired: "bg-[#f7e4df] text-[#924a40]",
  cancelled: "bg-[#ececec] text-[#6d716e]",
};

export const claimTone: Record<ClaimStatus, string> = {
  draft: "bg-[#f1eee5] text-[#806b45]",
  submitted: "bg-[#e7eee8] text-[#52705a]",
  assessing: "bg-[#e9edf3] text-[#526779]",
  "action-required": "bg-[#f7e4df] text-[#924a40]",
  settled: "bg-[#e6efe1] text-[#45604d]",
  closed: "bg-[#ececec] text-[#6d716e]",
};

export function InsuranceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise insurance information and documents. It is
      not an insurer, broker or financial adviser. Check policy wording with
      your provider and seek qualified advice when needed.
    </p>
  );
}

export function insuranceDaysUntil(value: string) {
  return sharedDaysUntil(value, "23:59:59");
}

export function PolicyRow({ policy }: { policy: InsurancePolicy }) {
  const icon =
    policy.type === "Home"
      ? "home"
      : policy.type === "Life"
        ? "heart"
        : "shield";
  const frequency =
    policy.premiumFrequency === "monthly"
      ? "mo"
      : policy.premiumFrequency === "annual"
        ? "yr"
        : "once";
  return (
    <Link
      href={`/office/insurance/${policy.id}`}
      className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {policy.title || policy.provider || "Policy awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {policy.provider || "Provider not confirmed"} ·{" "}
          {policy.renewalDate
            ? `Renews ${formatBillDate(policy.renewalDate)}`
            : "Renewal not recorded"}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-[#20352a]">
          {formatMoney(policy.premium)}
          <span className="text-[9px] font-normal text-[#667068]">
            /{frequency}
          </span>
        </span>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${policyTone[policy.status]}`}
        >
          {policy.reviewStatus === "needs-review"
            ? "Check details"
            : policy.status}
        </span>
      </span>
    </Link>
  );
}
