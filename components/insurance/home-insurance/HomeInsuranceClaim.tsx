"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { BillsCard, BillsHeader, BillsSectionTitle, BillsShell, fieldClass } from "@/components/bills/BillsUi";
import type { ClaimStatus, InsuranceClaim } from "@/lib/insurance-records";

import { HomeInsuranceNotice, NoHomePolicy, useHomePolicy } from "./home-insurance-shared";

const claimTypes = [
  "Escape of water",
  "Storm damage",
  "Fire or smoke",
  "Theft or burglary",
  "Accidental damage",
  "Home emergency",
  "Vandalism",
  "Other"
];

export function HomeInsuranceClaim() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const policy = useHomePolicy();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="New Home Claim" subtitle="Prepare the information for a home insurance claim." backHref="/office/insurance/home" />
        <NoHomePolicy />
      </BillsShell>
    );
  }
  const save = () => {
    if (!type) return;
    const now = new Date().toISOString();
    const claim: InsuranceClaim = {
      id: crypto.randomUUID(),
      policyId: policy.id,
      title: type,
      claimNumberMasked: "",
      incidentDate,
      status: "draft" as ClaimStatus,
      description,
      evidenceDocumentIds: [],
      createdAt: now,
      updatedAt: now
    };
    updateState(current => ({
      ...current,
      insurance: { ...current.insurance, claims: [claim, ...current.insurance.claims] }
    }));
    router.push("/office/insurance/claims");
  };
  return (
    <BillsShell>
      <BillsHeader title="New Home Claim" subtitle="Create an organisational claim pack, then add evidence in the Claims Centre." backHref="/office/insurance/home" />
      <BillsCard>
        <BillsSectionTitle icon="briefcase" title="What happened?" detail="Choose the closest description. Your insurer decides how a claim is categorised." />
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {claimTypes.map(item => (
            <button type="button" key={item} onClick={() => setType(item)} className={`min-h-[76px] rounded-[16px] border p-3 text-xs font-semibold ${type === item ? "border-[#52705a] bg-[#e6efe1] text-[#20352a]" : "border-[#20352a]/[0.07] bg-white text-[#667068]"}`}>{item}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-xs font-semibold text-[#667068]">Incident date<input type="date" value={incidentDate} onChange={event => setIncidentDate(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-semibold text-[#667068]">What happened?<textarea rows={5} value={description} onChange={event => setDescription(event.target.value)} className={fieldClass} placeholder="Write a factual description in your own words." /></label>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="check" title="Your claim pack" detail="After saving, collect the information your insurer requests." />
        <ul className="mt-4 space-y-2 text-xs leading-5 text-[#667068]">
          {[
            "Photos or videos of damage",
            "Receipts, documents and estimates",
            "A clear incident description and date",
            "Provider contact and policy details"
          ].map(item => <li key={item} className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">{item}</li>)}
        </ul>
        <button type="button" onClick={save} disabled={!type} className="mt-4 min-h-12 w-full rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white disabled:opacity-45">Save claim pack</button>
      </BillsCard>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}
