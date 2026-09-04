"use client";

import Link from "next/link";

import { UiIcon, type IconName } from "@/components/UiIcon";
import {
  contractMonthlyCost,
  type ContractRecord,
  type ContractStatus,
} from "@/lib/contract-records";
import { dateTime, daysUntil, formatDate } from "@/lib/presentation";

export type ContractsView =
  | "dashboard"
  | "all"
  | "checks"
  | "new"
  | "detail"
  | "cancel"
  | "forecast";

export type ContractIssue = {
  id: string;
  contractId: string;
  title: string;
  detail: string;
  tone: "amber" | "red" | "green" | "blue";
  icon: IconName;
};

export const contractStatusTone: Record<ContractStatus, string> = {
  draft: "bg-[#f1eee5] text-[#806b45]",
  active: "bg-[#e6efe1] text-[#45604d]",
  cancelled: "bg-[#ececec] text-[#6d716e]",
  expired: "bg-[#f7e4df] text-[#924a40]",
};

export function formatContractMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value || 0);
}

export function cancellationDeadline(contract: ContractRecord) {
  if (!contract.renewalDate || contract.noticePeriodDays === null) return "";
  return new Date(
    dateTime(contract.renewalDate) - contract.noticePeriodDays * 86400000,
  )
    .toISOString()
    .slice(0, 10);
}

export function currentPriceIncrease(contract: ContractRecord) {
  const history = [...contract.priceHistory].sort(
    (a, b) => dateTime(a.effectiveDate) - dateTime(b.effectiveDate),
  );
  if (history.length < 2) return null;
  const previous = history[history.length - 2].amount;
  const current = history[history.length - 1].amount;
  return current > previous
    ? { previous, current, change: current - previous }
    : null;
}

export function deriveContractIssues(contracts: ContractRecord[]) {
  const issues: ContractIssue[] = [];
  const active = contracts.filter(
    (contract) =>
      contract.reviewStatus === "reviewed" && contract.status === "active",
  );
  active.forEach((contract) => {
    const promoDays = daysUntil(contract.promotionalEndDate);
    const renewalDays = daysUntil(contract.renewalDate);
    const deadlineDays = daysUntil(cancellationDeadline(contract));
    const increase = currentPriceIncrease(contract);
    if (promoDays >= 0 && promoDays <= 60)
      issues.push({
        id: `${contract.id}-promo`,
        contractId: contract.id,
        title: "Promotional price ending",
        detail: `${contract.serviceName || contract.provider}: ${formatDate(contract.promotionalEndDate)}`,
        tone: "amber",
        icon: "bell",
      });
    if (contract.minimumTermEnd && daysUntil(contract.minimumTermEnd) < 0)
      issues.push({
        id: `${contract.id}-term`,
        contractId: contract.id,
        title: "Out of minimum term",
        detail: `${contract.serviceName || contract.provider} can be reviewed now`,
        tone: "green",
        icon: "clock",
      });
    if (increase)
      issues.push({
        id: `${contract.id}-price`,
        contractId: contract.id,
        title: "Price increase detected",
        detail: `${formatContractMoney(increase.previous)} to ${formatContractMoney(increase.current)}`,
        tone: "red",
        icon: "chart",
      });
    if (contract.autoRenew && renewalDays >= 0 && renewalDays <= 60)
      issues.push({
        id: `${contract.id}-renew`,
        contractId: contract.id,
        title: "Auto-renewal approaching",
        detail: `${contract.serviceName || contract.provider}: ${formatDate(contract.renewalDate)}`,
        tone: "amber",
        icon: "clock",
      });
    if (deadlineDays >= 0 && deadlineDays <= 30)
      issues.push({
        id: `${contract.id}-deadline`,
        contractId: contract.id,
        title: "Cancellation deadline approaching",
        detail: `Recorded deadline: ${formatDate(cancellationDeadline(contract))}`,
        tone: "red",
        icon: "alert",
      });
    if (!contract.storagePath)
      issues.push({
        id: `${contract.id}-document`,
        contractId: contract.id,
        title: "Contract document missing",
        detail: `${contract.serviceName || contract.provider} has no original file attached`,
        tone: "blue",
        icon: "file",
      });
    if (!contract.lastReviewedAt || daysUntil(contract.lastReviewedAt) < -365)
      issues.push({
        id: `${contract.id}-review`,
        contractId: contract.id,
        title: "Not reviewed recently",
        detail: `${contract.serviceName || contract.provider} needs a details check`,
        tone: "blue",
        icon: "check",
      });
  });
  const grouped = new Map<string, ContractRecord[]>();
  active.forEach((contract) => {
    const key = `${contract.category}:${contract.provider}`.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), contract]);
  });
  grouped.forEach((matches) => {
    if (matches.length > 1)
      matches.forEach((contract) =>
        issues.push({
          id: `${contract.id}-duplicate`,
          contractId: contract.id,
          title: "Possible duplicate subscription",
          detail: `${matches.length} active ${contract.provider} records`,
          tone: "blue",
          icon: "alert",
        }),
      );
  });
  return issues;
}

export function ContractNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise contract information and reminders. It does
      not cancel services or provide financial advice. Always check dates,
      prices and notice terms against the original contract and confirm
      cancellation directly with the provider.
    </p>
  );
}

export function ContractRow({ contract }: { contract: ContractRecord }) {
  const icon =
    contract.category === "Broadband" || contract.category === "Mobile"
      ? "phone"
      : contract.category === "Membership"
        ? "users"
        : "file";
  return (
    <Link
      href={`/office/contracts/${contract.id}`}
      className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {contract.serviceName ||
            contract.provider ||
            "Contract awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {contract.provider || "Provider not confirmed"} ·{" "}
          {contract.renewalDate
            ? `Renews ${formatDate(contract.renewalDate)}`
            : "No renewal date"}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-[#20352a]">
          {formatContractMoney(contractMonthlyCost(contract))}
          <span className="text-[9px] font-normal text-[#667068]">/mo</span>
        </span>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${contractStatusTone[contract.status]}`}
        >
          {contract.reviewStatus === "needs-review"
            ? "Check details"
            : contract.status}
        </span>
      </span>
    </Link>
  );
}
