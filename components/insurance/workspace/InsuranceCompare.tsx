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
import { formatMoney } from "@/lib/bill-records";
import { InsuranceNotice } from "./insurance-shared";

export function InsuranceCompare() {
  const { state } = useDiaryDockData();
  const comparable = state.insurance.policies.filter(
    (policy) => policy.reviewStatus === "reviewed" && policy.history.length > 1,
  );
  return (
    <BillsShell>
      <BillsHeader
        title="Renewal Comparison"
        subtitle="Compare premium and excess amounts you previously confirmed."
        backHref="/office/insurance"
      />
      <div className="space-y-4">
        {comparable.length ? (
          comparable.map((policy) => {
            const previous = policy.history[policy.history.length - 2];
            const latest = policy.history[policy.history.length - 1];
            return (
              <BillsCard key={policy.id}>
                <BillsSectionTitle
                  icon="chart"
                  title={policy.title}
                  detail={policy.provider}
                />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-[14px] bg-[#f6f5ef] p-3">
                    <p className="text-[10px] text-[#667068]">Previous</p>
                    <p className="mt-1 font-semibold text-[#20352a]">
                      {formatMoney(previous.premium)}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-[#f6f5ef] p-3">
                    <p className="text-[10px] text-[#667068]">Current</p>
                    <p className="mt-1 font-semibold text-[#20352a]">
                      {formatMoney(latest.premium)}
                    </p>
                  </div>
                  <div
                    className={`rounded-[14px] p-3 ${latest.premium > previous.premium ? "bg-[#f7e4df]" : "bg-[#e6efe1]"}`}
                  >
                    <p className="text-[10px] text-[#667068]">Change</p>
                    <p className="mt-1 font-semibold text-[#20352a]">
                      {latest.premium >= previous.premium ? "+" : ""}
                      {formatMoney(latest.premium - previous.premium)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/office/insurance/${policy.id}`}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#45604d]"
                >
                  Review full policy
                  <UiIcon name="chevron-right" className="ml-1 h-4 w-4" />
                </Link>
              </BillsCard>
            );
          })
        ) : (
          <BillsCard>
            <p className="text-center text-sm leading-6 text-[#667068]">
              Comparisons will appear after you update and confirm a policy with
              a new premium, excess or renewal date.
            </p>
          </BillsCard>
        )}
      </div>
      <InsuranceNotice />
    </BillsShell>
  );
}
