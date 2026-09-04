"use client";

import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { BillsCard } from "@/components/bills/BillsUi";

export type HomeInsuranceView =
  | "dashboard"
  | "cover"
  | "inventory"
  | "high-value"
  | "check"
  | "claim";

export function HomeInsuranceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock organises information you record about your home insurance. It
      does not assess whether your cover is adequate, make a valuation, submit a
      claim or provide financial or insurance advice.
    </p>
  );
}

export function parseCoverValue(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export function useHomePolicy() {
  const { state } = useDiaryDockData();
  return (
    state.insurance.policies.find(policy =>
      policy.type === "Home" &&
      policy.reviewStatus === "reviewed" &&
      policy.status === "active"
    ) ?? state.insurance.policies.find(policy =>
      policy.type === "Home" && policy.reviewStatus === "reviewed"
    )
  );
}

export function NoHomePolicy() {
  return (
    <>
      <BillsCard>
        <div className="rounded-[20px] bg-[#f6f5ef] px-5 py-8 text-center">
          <UiIcon name="home" className="mx-auto h-9 w-9 text-[#6f8e72]" />
          <h2 className="mt-3 text-lg font-semibold text-[#20352a]">Add your home policy first</h2>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-5 text-[#667068]">
            Upload or enter your home insurance policy, then confirm its details
            before using cover checks, inventory totals or claims.
          </p>
          <Link href="/office/insurance/new" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] px-5 text-sm font-semibold text-white">
            Add home policy
          </Link>
        </div>
      </BillsCard>
      <HomeInsuranceNotice />
    </>
  );
}
