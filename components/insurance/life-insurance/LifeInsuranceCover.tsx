"use client";

import Link from "next/link";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { BillsCard, BillsHeader, BillsSectionTitle, BillsShell, fieldClass } from "@/components/bills/BillsUi";
import type { LifePolicyDetails } from "@/lib/insurance-records";

import {
  defaultLifeDetails,
  LifeInsuranceNotice,
  NoLifePolicy,
  useLifePolicy
} from "./life-insurance-shared";

export function LifeInsuranceCover() {
  const { state, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const stored = policy
    ? state.insurance.lifePolicyDetails.find(item => item.policyId === policy.id)
    : undefined;
  const [draft, setDraft] = useState<LifePolicyDetails>(() => stored ?? defaultLifeDetails(policy?.id ?? ""));
  const [saved, setSaved] = useState(false);
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="Cover Summary" subtitle="Record a plain-language view of your life policy." backHref="/office/insurance/life" />
        <NoLifePolicy />
      </BillsShell>
    );
  }
  const save = () => {
    const updated = { ...draft, policyId: policy.id, lastReviewedAt: new Date().toISOString() };
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
    setDraft(updated);
    setSaved(true);
  };
  return (
    <BillsShell>
      <BillsHeader title="Cover Summary" subtitle="Record what the policy says in clear, practical terms." backHref="/office/insurance/life" />
      <BillsCard>
        <BillsSectionTitle icon="heart" title="Who and what is covered" detail="Copy important details from the original policy and verify them before saving." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField label="Person covered" value={draft.coveredPerson} onChange={value => setDraft({ ...draft, coveredPerson: value })} />
          <NumberField label="Cover amount (£)" value={draft.coverAmount} onChange={value => setDraft({ ...draft, coverAmount: value })} />
          <label className="text-xs font-semibold text-[#667068]">
            Cover type
            <select value={draft.coverType} onChange={event => setDraft({ ...draft, coverType: event.target.value as LifePolicyDetails["coverType"] })} className={fieldClass}>
              <option value="lump-sum">Lump sum</option>
              <option value="family-income">Family income</option>
              <option value="decreasing">Decreasing cover</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">Term ends<input type="date" value={draft.termEndDate} onChange={event => setDraft({ ...draft, termEndDate: event.target.value })} className={fieldClass} /></label>
          <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
            <input type="checkbox" checked={draft.criticalIllnessIncluded} onChange={event => setDraft({ ...draft, criticalIllnessIncluded: event.target.checked })} className="h-4 w-4 accent-[#45604d]" />
            Critical illness cover included
          </label>
          <NumberField label="Critical illness amount (£)" value={draft.criticalIllnessAmount} onChange={value => setDraft({ ...draft, criticalIllnessAmount: value })} />
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Important exclusions
            <textarea rows={4} value={draft.exclusions} onChange={event => setDraft({ ...draft, exclusions: event.target.value })} className={fieldClass} placeholder="Record wording to double-check in the original policy." />
          </label>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="phone" title="Claim and adviser contacts" detail="Keep practical contact details where your family can find them." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField label="Claims phone" value={draft.claimsPhone} onChange={value => setDraft({ ...draft, claimsPhone: value })} />
          <TextField label="Adviser name" value={draft.adviserName} onChange={value => setDraft({ ...draft, adviserName: value })} />
          <TextField label="Adviser phone" value={draft.adviserPhone} onChange={value => setDraft({ ...draft, adviserPhone: value })} />
          <TextField label="Emergency contact" value={draft.emergencyContactName} onChange={value => setDraft({ ...draft, emergencyContactName: value })} />
          <div className="sm:col-span-2"><TextField label="Emergency contact phone" value={draft.emergencyContactPhone} onChange={value => setDraft({ ...draft, emergencyContactPhone: value })} /></div>
        </div>
        <button type="button" onClick={save} className="mt-5 min-h-12 w-full rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white">Save cover summary</button>
        {saved ? <p role="status" className="mt-3 text-xs font-semibold text-[#52705a]">Cover summary saved.</p> : null}
      </BillsCard>
      <Link href={`/office/insurance/${policy.id}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]">View full policy wording</Link>
      <LifeInsuranceNotice />
    </BillsShell>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-[#667068]">{label}<input value={value} onChange={event => onChange(event.target.value)} className={fieldClass} /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-xs font-semibold text-[#667068]">{label}<input type="number" min="0" value={value || ""} onChange={event => onChange(Number(event.target.value))} className={fieldClass} /></label>;
}
