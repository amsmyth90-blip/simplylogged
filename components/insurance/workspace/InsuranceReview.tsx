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
import { officeInsuranceTypes } from "@/lib/insurance-records";
import { InsuranceNotice, PolicyRow } from "./insurance-shared";

export function InsuranceReview() {
  const { state } = useDiaryDockData();
  const inbox = state.insurance.policies.filter(
    (policy) => policy.reviewStatus === "needs-review",
  );
  const active = state.insurance.policies.filter(
    (policy) =>
      policy.reviewStatus === "reviewed" && policy.status === "active",
  );
  const duplicates = officeInsuranceTypes
    .map((type) => ({
      type,
      count: active.filter((policy) => policy.type === type).length,
    }))
    .filter((item) => item.count > 1);
  const beneficiary = active.filter(
    (policy) =>
      (policy.type === "Life" ||
        policy.type === "Income protection" ||
        policy.type === "Critical illness") &&
      !policy.beneficiaries.trim(),
  );
  return (
    <BillsShell>
      <BillsHeader
        title="Cover Review"
        subtitle="Prompts that help you notice missing information and possible overlap."
        backHref="/office/insurance"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="file"
          title="Documents to check"
          detail={`${inbox.length} uploaded polic${inbox.length === 1 ? "y" : "ies"} awaiting confirmation`}
        />
        <div className="mt-4 space-y-3">
          {inbox.length ? (
            inbox.map((policy) => <PolicyRow key={policy.id} policy={policy} />)
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#667068]">
              All uploaded policies have been reviewed.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Possible gaps and overlaps"
          detail="These are organisational prompts, not a professional assessment."
        />
        <div className="mt-4 space-y-2">
          {duplicates.map((item) => (
            <p
              key={item.type}
              className="rounded-[14px] bg-[#f4ead7] px-3 py-3 text-xs text-[#735f3e]"
            >
              You have {item.count} active {item.type.toLowerCase()} policies.
              Check whether their cover overlaps.
            </p>
          ))}
          {beneficiary.map((policy) => (
            <Link
              key={policy.id}
              href={`/office/insurance/${policy.id}`}
              className="flex items-center justify-between rounded-[14px] bg-[#f7e4df] px-3 py-3 text-xs text-[#80493f]"
            >
              {policy.title}: no beneficiary or review note recorded
              <UiIcon name="chevron-right" className="h-4 w-4" />
            </Link>
          ))}
          {!duplicates.length && !beneficiary.length ? (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#667068]">
              No prompts based on the information currently recorded.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <InsuranceNotice />
    </BillsShell>
  );
}
