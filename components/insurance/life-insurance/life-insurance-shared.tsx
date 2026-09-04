"use client";

import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { BillsCard } from "@/components/bills/BillsUi";
import type { LifePolicyDetails } from "@/lib/insurance-records";

export type LifeInsuranceView = "dashboard" | "cover" | "beneficiaries" | "claim-pack";

export function LifeInsuranceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock organises life-insurance information and family guidance. It
      does not assess suitability, interpret policy wording, provide financial
      or legal advice, or submit claims. Always check the original policy and
      speak to an appropriate professional when needed.
    </p>
  );
}

export function useLifePolicy() {
  const { state } = useDiaryDockData();
  return (
    state.insurance.policies.find(policy =>
      policy.type === "Life" &&
      policy.reviewStatus === "reviewed" &&
      policy.status === "active"
    ) ?? state.insurance.policies.find(policy =>
      policy.type === "Life" && policy.reviewStatus === "reviewed"
    )
  );
}

export function defaultLifeDetails(policyId: string): LifePolicyDetails {
  return {
    policyId,
    coveredPerson: "",
    coverAmount: 0,
    coverType: "lump-sum",
    termEndDate: "",
    criticalIllnessIncluded: false,
    criticalIllnessAmount: 0,
    exclusions: "",
    claimsPhone: "",
    adviserName: "",
    adviserPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    inTrust: false,
    trustName: "",
    trusteeNames: "",
    familyGuidance: "",
    lastReviewedAt: ""
  };
}

export function NoLifePolicy() {
  return (
    <>
      <BillsCard>
        <div className="rounded-[20px] bg-[#f6f5ef] px-5 py-8 text-center">
          <UiIcon name="heart" className="mx-auto h-9 w-9 text-[#6f8e72]" />
          <h2 className="mt-3 text-lg font-semibold text-[#20352a]">Add your life policy first</h2>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-5 text-[#667068]">Upload or enter a life-insurance policy and confirm its details before recording beneficiaries or preparing family guidance.</p>
          <Link href="/office/insurance/new" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] px-5 text-sm font-semibold text-white">Add life policy</Link>
        </div>
      </BillsCard>
      <LifeInsuranceNotice />
    </>
  );
}
