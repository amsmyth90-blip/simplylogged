"use client";

import Link from "next/link";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { BillsCard, BillsHeader, BillsSectionTitle, BillsShell, fieldClass } from "@/components/bills/BillsUi";
import { formatMoney } from "@/lib/bill-records";

import {
  defaultLifeDetails,
  LifeInsuranceNotice,
  NoLifePolicy,
  useLifePolicy
} from "./life-insurance-shared";

export function LifeInsuranceClaimPack() {
  const { state, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const stored = policy
    ? state.insurance.lifePolicyDetails.find(item => item.policyId === policy.id)
    : undefined;
  const [guidance, setGuidance] = useState(stored?.familyGuidance ?? "");
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="Family Claim Pack" subtitle="Organise essential information for your family." backHref="/office/insurance/life" />
        <NoLifePolicy />
      </BillsShell>
    );
  }
  const details = stored ?? defaultLifeDetails(policy.id);
  const beneficiaries = state.insurance.lifeBeneficiaries.filter(item => item.policyId === policy.id);
  const saveGuidance = () => {
    const updated = {
      ...details,
      familyGuidance: guidance,
      lastReviewedAt: new Date().toISOString()
    };
    updateState(current => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifePolicyDetails: [
          updated,
          ...current.insurance.lifePolicyDetails.filter(item => item.policyId !== policy.id)
        ]
      }
    }));
  };
  const required = [
    { label: "Policy number", ready: Boolean(policy.policyNumberMasked), value: policy.policyNumberMasked },
    { label: "Provider", ready: Boolean(policy.provider), value: policy.provider },
    { label: "Claims phone", ready: Boolean(details.claimsPhone), value: details.claimsPhone },
    { label: "Cover amount", ready: Boolean(details.coverAmount), value: details.coverAmount ? formatMoney(details.coverAmount) : "" },
    { label: "Beneficiary notes", ready: beneficiaries.length > 0, value: beneficiaries.length ? `${beneficiaries.length} recorded` : "" },
    { label: "Trust details", ready: !details.inTrust || Boolean(details.trustName && details.trusteeNames), value: details.inTrust ? details.trustName : "Not recorded as in trust" }
  ];
  return (
    <BillsShell>
      <BillsHeader title="Family Claim Pack" subtitle="Keep the practical information your loved ones may need together." backHref="/office/insurance/life" />
      <BillsCard>
        <BillsSectionTitle icon="file" title="Essential information" detail={`${required.filter(item => item.ready).length} of ${required.length} items ready`} />
        <div className="mt-4 space-y-2">
          {required.map(item => (
            <div key={item.label} className="flex items-center gap-3 rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
              <UiIcon name={item.ready ? "check" : "alert"} className={`h-4 w-4 shrink-0 ${item.ready ? "text-[#52705a]" : "text-[#9a584a]"}`} />
              <span className="min-w-0 flex-1 text-[#667068]">{item.label}</span>
              <strong className="max-w-[48%] truncate text-right text-[#20352a]">{item.value || "Not recorded"}</strong>
            </div>
          ))}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="folder" title="Documents your family may need" detail="The insurer will confirm its exact requirements." />
        <ul className="mt-4 space-y-2 text-xs text-[#667068]">
          {["Original policy document and schedule", "Proof of identity requested by the insurer", "Death certificate or other evidence requested", "Trust documents, where applicable"].map(item => <li key={item} className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">{item}</li>)}
        </ul>
        <Link href={`/office/insurance/${policy.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#45604d]"><UiIcon name="file" className="h-4 w-4" />Open policy documents</Link>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="heart" title="Family guidance" detail="Practical notes only — not instructions that alter the policy, trust or a will." />
        <textarea rows={6} value={guidance} onChange={event => setGuidance(event.target.value)} className={fieldClass} placeholder="Where the original is kept, who to contact first, adviser details…" />
        <button type="button" onClick={saveGuidance} className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white">Save family guidance</button>
      </BillsCard>
      {details.emergencyContactName || details.emergencyContactPhone ? (
        <BillsCard className="bg-[#f4ead7]">
          <BillsSectionTitle icon="phone" title="Emergency contact" detail={details.emergencyContactName || "Name not recorded"} />
          {details.emergencyContactPhone ? <a href={`tel:${details.emergencyContactPhone}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-white px-4 text-sm font-semibold text-[#45604d]"><UiIcon name="phone" className="h-4 w-4" />Call {details.emergencyContactPhone}</a> : null}
        </BillsCard>
      ) : null}
      <LifeInsuranceNotice />
    </BillsShell>
  );
}
