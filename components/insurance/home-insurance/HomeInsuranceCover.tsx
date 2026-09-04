"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { BillsCard, BillsHeader, BillsSectionTitle, BillsShell } from "@/components/bills/BillsUi";
import { formatMoney } from "@/lib/bill-records";

import { HomeInsuranceNotice, NoHomePolicy, useHomePolicy } from "./home-insurance-shared";

export function HomeInsuranceCover() {
  const policy = useHomePolicy();
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="Cover Details" subtitle="Review the cover information you have confirmed." backHref="/office/insurance/home" />
        <NoHomePolicy />
      </BillsShell>
    );
  }
  const included = policy.coverItems.filter(item => item.included);
  const excluded = policy.coverItems.filter(item => !item.included);
  return (
    <BillsShell>
      <BillsHeader title="Cover Details" subtitle="A plain-language view of information recorded from your policy documents." backHref="/office/insurance/home" />
      <BillsCard>
        <BillsSectionTitle icon="home" title="Buildings and contents" detail={policy.coverSummary || "No plain-language summary has been recorded."} />
        <div className="mt-4 space-y-2">
          {included.length ? included.map(item => (
            <div key={item.id} className="flex items-start gap-3 rounded-[14px] bg-[#f6f5ef] px-3 py-3">
              <UiIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[#52705a]" />
              <span className="min-w-0 flex-1 text-xs font-semibold text-[#20352a]">{item.label}</span>
              <span className="text-right text-[11px] text-[#667068]">{item.value}</span>
            </div>
          )) : <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">No included cover items recorded.</p>}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="alert" title="Excesses and exclusions" detail={`Recorded policy excess: ${formatMoney(policy.excess)}`} />
        <div className="mt-4 space-y-2">
          {excluded.map(item => (
            <div key={item.id} className="flex items-start gap-3 rounded-[14px] bg-[#f7e4df] px-3 py-3">
              <UiIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-[#924a40]" />
              <span className="min-w-0 flex-1 text-xs font-semibold text-[#6f4039]">{item.label}</span>
              <span className="text-right text-[11px] text-[#80524b]">{item.value}</span>
            </div>
          ))}
          {!excluded.length ? <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">No exclusions have been recorded here. Always check the complete policy wording.</p> : null}
        </div>
      </BillsCard>
      <Link href={`/office/insurance/${policy.id}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]">Open full policy record</Link>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}
