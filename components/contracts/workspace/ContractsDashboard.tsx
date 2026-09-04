"use client";

import Link from "next/link";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  contractAnnualCost,
  contractMonthlyCost,
} from "@/lib/contract-records";
import { dateTime, daysUntil } from "@/lib/presentation";

import {
  cancellationDeadline,
  ContractNotice,
  ContractRow,
  deriveContractIssues,
  formatContractMoney,
} from "./contracts-shared";

export function ContractsDashboard() {
  const { state, hydrated } = useDiaryDockData();
  const reviewed = state.contracts.contracts.filter(
    (contract) => contract.reviewStatus === "reviewed",
  );
  const active = reviewed.filter((contract) => contract.status === "active");
  const issues = deriveContractIssues(state.contracts.contracts);
  const endingSoon = active.filter(
    (contract) =>
      daysUntil(contract.minimumTermEnd) >= 0 &&
      daysUntil(contract.minimumTermEnd) <= 60,
  );
  const renewals = active.filter(
    (contract) =>
      daysUntil(contract.renewalDate) >= 0 &&
      daysUntil(contract.renewalDate) <= 60,
  );
  const cancellationWindows = active.filter((contract) => {
    const days = daysUntil(cancellationDeadline(contract));
    return days >= 0 && days <= 30;
  });
  const recent = [...active]
    .sort((a, b) => dateTime(a.renewalDate) - dateTime(b.renewalDate))
    .slice(0, 4);
  if (!hydrated)
    return (
      <BillsShell>
        <BillsCard>
          <p className="text-sm text-[#667068]">Opening your contracts…</p>
        </BillsCard>
      </BillsShell>
    );
  return (
    <BillsShell>
      <BillsHeader
        title="Contracts & Subscriptions"
        subtitle="See what you pay for, when contracts end and what renews automatically."
      />
      <BillsCard className="bg-[#355540] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
              Overview
            </p>
            <h2 className="mt-1 text-xl font-semibold">Your commitments</h2>
          </div>
          <UiIcon name="briefcase" className="h-5 w-5 text-white/75" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{active.length}</p>
            <p className="text-[11px] text-white/70">Active contracts</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{endingSoon.length}</p>
            <p className="text-[11px] text-white/70">Ending soon</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-xl font-semibold">
              {formatContractMoney(
                active.reduce(
                  (sum, contract) => sum + contractMonthlyCost(contract),
                  0,
                ),
              )}
            </p>
            <p className="text-[11px] text-white/70">Monthly equivalent</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-xl font-semibold">
              {formatContractMoney(
                active.reduce(
                  (sum, contract) => sum + contractAnnualCost(contract),
                  0,
                ),
              )}
            </p>
            <p className="text-[11px] text-white/70">Annual commitment</p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Things to check"
          detail={
            issues.length
              ? `${issues.length} item${issues.length === 1 ? "" : "s"} need your attention`
              : "Nothing needs attention based on confirmed details"
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-[14px] bg-[#f7f6f0] p-3">
            <p className="text-lg font-semibold text-[#20352a]">
              {renewals.length}
            </p>
            <p className="text-[10px] text-[#667068]">Renewals soon</p>
          </div>
          <div className="rounded-[14px] bg-[#f7f6f0] p-3">
            <p className="text-lg font-semibold text-[#20352a]">
              {cancellationWindows.length}
            </p>
            <p className="text-[10px] text-[#667068]">Cancellation windows</p>
          </div>
          <div className="col-span-2 rounded-[14px] bg-[#f7f6f0] p-3 sm:col-span-1">
            <p className="text-lg font-semibold text-[#20352a]">
              {
                state.contracts.contracts.filter(
                  (contract) => contract.reviewStatus === "needs-review",
                ).length
              }
            </p>
            <p className="text-[10px] text-[#667068]">Waiting for review</p>
          </div>
        </div>
        <Link
          href="/office/contracts/checks"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Review all things to check
          <UiIcon name="chevron-right" className="h-4 w-4" />
        </Link>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between">
          <BillsSectionTitle
            icon="file"
            title="Active contracts"
            detail={
              recent.length
                ? "Next renewals at a glance"
                : "No confirmed contracts yet"
            }
          />
          <Link
            href="/office/contracts/all"
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
          >
            See all
          </Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {recent.length ? (
            recent.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
              Add a contract manually or upload its document. Nothing is
              included in totals until you confirm it.
            </p>
          )}
        </div>
        <Link
          href="/office/contracts/new"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add or upload a contract
        </Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/contracts/all"
          icon="folder"
          title="All contracts"
          detail="Search and filter every commitment"
          badge={`${reviewed.length}`}
        />
        <BillsAction
          href="/office/contracts/checks"
          icon="alert"
          title="Things to check"
          detail="Renewals, price changes and possible duplicates"
          badge={`${issues.length}`}
        />
        <BillsAction
          href="/office/contracts/forecast"
          icon="chart"
          title="Commitment forecast"
          detail="See your next 12 months"
        />
        <BillsAction
          href="/office/contracts/new"
          icon="camera"
          title="Document inbox"
          detail="Upload and check a contract"
        />
      </div>
      <ContractNotice />
    </BillsShell>
  );
}
