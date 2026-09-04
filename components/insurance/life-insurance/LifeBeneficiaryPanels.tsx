"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { BillsCard, BillsSectionTitle, fieldClass } from "@/components/bills/BillsUi";

import type { LifeBeneficiariesController } from "./useLifeBeneficiariesController";

type Props = { controller: LifeBeneficiariesController };

export function BeneficiariesPanel({ controller }: Props) {
  const {
    showForm, setShowForm, beneficiaries, total, removeBeneficiary
  } = controller;
  return (
    <BillsCard>
      <div className="flex items-center justify-between gap-3">
        <BillsSectionTitle icon="users" title="Beneficiaries" detail={`${beneficiaries.length} recorded · total ${total}%`} />
        <button type="button" onClick={() => setShowForm(value => !value)} aria-label="Add beneficiary" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f5140] text-white"><UiIcon name="plus" className="h-5 w-5" /></button>
      </div>
      {total !== 100 && beneficiaries.length ? <p className="mt-4 rounded-[14px] bg-[#f4ead7] px-3 py-3 text-xs leading-5 text-[#735f3e]">The percentages recorded here total {total}%. Check them against the insurer or trust documents.</p> : null}
      {showForm ? <BeneficiaryForm controller={controller} /> : null}
      <div className="mt-4 space-y-3">
        {beneficiaries.length ? beneficiaries.map(item => (
          <article key={item.id} className="flex items-center gap-3 rounded-[16px] border border-[#20352a]/[0.07] bg-white p-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef2e9] text-[#52705a]"><UiIcon name="users" className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#20352a]">{item.name}</span>
              <span className="text-[11px] text-[#667068]">{item.relationship || "Relationship not recorded"}{item.primary ? " · Primary" : ""}</span>
            </span>
            <strong className="text-sm text-[#20352a]">{item.percentage}%</strong>
            <button type="button" onClick={() => removeBeneficiary(item.id)} aria-label={`Remove ${item.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#8a5145]"><UiIcon name="plus" className="h-4 w-4 rotate-45" /></button>
          </article>
        )) : <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">No beneficiary notes recorded.</p>}
      </div>
    </BillsCard>
  );
}

function BeneficiaryForm({ controller }: Props) {
  const { draft, setDraft, addBeneficiary } = controller;
  return (
    <div className="mt-4 rounded-[18px] bg-[#f6f5ef] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">Name<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-[#667068]">Relationship<input value={draft.relationship} onChange={event => setDraft({ ...draft, relationship: event.target.value })} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-[#667068]">Percentage<input type="number" min="0" max="100" value={draft.percentage || ""} onChange={event => setDraft({ ...draft, percentage: Math.min(100, Number(event.target.value)) })} className={fieldClass} /></label>
        <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]"><input type="checkbox" checked={draft.primary} onChange={event => setDraft({ ...draft, primary: event.target.checked })} className="h-4 w-4 accent-[#45604d]" />Primary beneficiary</label>
      </div>
      <button type="button" onClick={addBeneficiary} className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white">Save beneficiary note</button>
    </div>
  );
}

export function TrustPanel({ controller }: Props) {
  const { trust, setTrust, saveTrust } = controller;
  return (
    <BillsCard>
      <BillsSectionTitle icon="lock" title="Trust details" detail="Record factual information from your trust paperwork; DiaryDock does not create or validate a trust." />
      <label className="mt-4 flex min-h-11 items-center gap-3 rounded-[14px] bg-[#f6f5ef] px-3 text-sm text-[#20352a]"><input type="checkbox" checked={trust.inTrust} onChange={event => setTrust({ ...trust, inTrust: event.target.checked })} className="h-4 w-4 accent-[#45604d]" />Policy recorded as held in trust</label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">Trust name<input value={trust.trustName} onChange={event => setTrust({ ...trust, trustName: event.target.value })} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-[#667068]">Trustees<input value={trust.trusteeNames} onChange={event => setTrust({ ...trust, trusteeNames: event.target.value })} className={fieldClass} placeholder="Names separated by commas" /></label>
      </div>
      <button type="button" onClick={saveTrust} className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]">Save trust notes</button>
    </BillsCard>
  );
}

export function LinkedPeoplePanel({ controller }: Props) {
  const { policy, householdNames, toggleLinkedPerson } = controller;
  if (!policy) return null;
  return (
    <BillsCard>
      <BillsSectionTitle icon="users" title="People linked to this policy" detail="Linking helps organisation only; it does not grant policy or document access." />
      <div className="mt-4 flex flex-wrap gap-2">
        {householdNames.length ? householdNames.map(name => (
          <button type="button" key={name} onClick={() => toggleLinkedPerson(name)} className={`min-h-10 rounded-full px-3 text-xs font-semibold ${policy.linkedPeople.includes(name) ? "bg-[#355540] text-white" : "bg-[#f0f2e9] text-[#52705a]"}`}>{name}</button>
        )) : <p className="text-xs text-[#667068]">Add household profiles to link people.</p>}
      </div>
      <Link href="/family" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#45604d]"><UiIcon name="shield" className="h-4 w-4" />Manage actual access</Link>
    </BillsCard>
  );
}
