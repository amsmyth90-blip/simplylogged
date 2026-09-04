"use client";

import Link from "next/link";
import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  ContractNotice,
  ContractRow,
  deriveContractIssues,
} from "./contracts-shared";

export function ContractChecks() {
  const { state } = useDiaryDockData();
  const issues = deriveContractIssues(state.contracts.contracts);
  const inbox = state.contracts.contracts.filter(
    (contract) => contract.reviewStatus === "needs-review",
  );
  const tone = {
    amber: "bg-[#fbf0da] text-[#93641e]",
    red: "bg-[#f9e7e2] text-[#9a4f43]",
    green: "bg-[#e7efe3] text-[#49644d]",
    blue: "bg-[#e9edf5] text-[#536a8c]",
  } as const;
  return (
    <BillsShell>
      <BillsHeader
        title="Things to Check"
        subtitle="DiaryDock highlights dates and details worth reviewing. It never acts on a contract for you."
        backHref="/office/contracts"
      />
      {inbox.length ? (
        <BillsCard>
          <BillsSectionTitle
            icon="mail"
            title="Waiting for confirmation"
            detail={`${inbox.length} uploaded or draft contract${inbox.length === 1 ? "" : "s"}`}
          />
          <div className="mt-4 space-y-2.5">
            {inbox.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))}
          </div>
        </BillsCard>
      ) : null}
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Calculated checks"
          detail={
            issues.length
              ? `${issues.length} check${issues.length === 1 ? "" : "s"} from your confirmed records`
              : "No checks are currently due"
          }
        />
        <div className="mt-4 space-y-3">
          {issues.length ? (
            issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/office/contracts/${issue.contractId}`}
                className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
              >
                <span
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${tone[issue.tone]}`}
                >
                  <UiIcon name={issue.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#20352a]">
                    {issue.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-[#667068]">
                    {issue.detail}
                  </span>
                </span>
                <UiIcon
                  name="chevron-right"
                  className="h-4 w-4 text-[#6f8e72]"
                />
              </Link>
            ))
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-7 text-center text-sm text-[#667068]">
              Add and confirm contract dates to receive useful checks here.
            </p>
          )}
        </div>
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}
