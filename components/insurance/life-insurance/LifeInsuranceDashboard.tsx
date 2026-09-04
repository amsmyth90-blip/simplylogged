"use client";

import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { BillsAction, BillsCard, BillsHeader, BillsSectionTitle, BillsShell } from "@/components/bills/BillsUi";
import { formatBillDate, formatMoney } from "@/lib/bill-records";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

import {
  defaultLifeDetails,
  LifeInsuranceNotice,
  NoLifePolicy,
  useLifePolicy
} from "./life-insurance-shared";

export function LifeInsuranceDashboard() {
  const { state, hydrated, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const [message, setMessage] = useState("");
  if (!hydrated) {
    return <BillsShell><div className="rounded-[28px] bg-white/70 p-8 text-sm text-[#667068]">Opening life insurance…</div></BillsShell>;
  }
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="Life Insurance" subtitle="Protect the people you love by keeping the information they may need organised." backHref="/office/insurance" />
        <NoLifePolicy />
      </BillsShell>
    );
  }
  const details = state.insurance.lifePolicyDetails.find(item => item.policyId === policy.id) ?? defaultLifeDetails(policy.id);
  const beneficiaries = state.insurance.lifeBeneficiaries.filter(item => item.policyId === policy.id);
  const addReviewReminder = async () => {
    const dueDate = new Date();
    dueDate.setFullYear(dueDate.getFullYear() + 1);
    const isoDate = dueDate.toISOString().slice(0, 10);
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: `Review ${policy.title}`,
      note: "Check cover, beneficiaries, trust notes and family guidance after any major life changes.",
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatBillDate(isoDate),
      priority: "normal",
      documentId: policy.documentId,
      documentTitle: policy.title,
      dueDate: isoDate,
      repeat: "Annual"
    };
    updateState(current => ({ ...current, reminders: [reminder, ...current.reminders] }));
    await upsertStructuredReminder(reminder);
    setMessage("Annual life-policy review reminder added.");
  };
  return (
    <BillsShell>
      <BillsHeader title="Life Insurance" subtitle="Keep your policy, beneficiaries and family claim information organised and easy to find." backHref="/office/insurance" />
      <BillsCard>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="shield" className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div><h2 className="text-base font-semibold text-[#20352a]">{policy.title}</h2><p className="mt-0.5 text-[11px] text-[#667068]">{policy.provider}</p></div>
              <span className="rounded-full bg-[#e6efe1] px-2.5 py-1 text-[9px] font-semibold capitalize text-[#45604d]">{policy.status}</span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
              <p className="text-[#667068]">Policy number <strong className="float-right text-[#20352a]">{policy.policyNumberMasked || "Not recorded"}</strong></p>
              <p className="text-[#667068]">Started <strong className="float-right text-[#20352a]">{formatBillDate(policy.startDate)}</strong></p>
            </div>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="heart" title="Policy at a glance" detail="Confirmed policy details and family records" />
        <div className="mt-4 space-y-2">
          <PolicyRow label="Cover amount" value={details.coverAmount ? formatMoney(details.coverAmount) : "Not recorded"} />
          <PolicyRow label="Premium" value={`${formatMoney(policy.premium)}/${policy.premiumFrequency === "monthly" ? "mo" : policy.premiumFrequency === "annual" ? "yr" : "once"}`} />
          <PolicyRow label="Renewal date" value={formatBillDate(policy.renewalDate)} />
          <PolicyRow label="Term ends" value={formatBillDate(details.termEndDate)} />
          <PolicyRow label="Beneficiaries" value={String(beneficiaries.length)} />
        </div>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction href={`/office/insurance/${policy.id}`} icon="file" title="Policy documents" detail="View the policy record and original file" />
        <BillsAction href="/office/insurance/life/cover" icon="shield" title="Cover summary" detail="Plain-language cover information" />
        <BillsAction href="/office/insurance/life/beneficiaries" icon="users" title="Beneficiaries & family" detail="Record percentage splits and trust notes" />
        <BillsAction href="/office/insurance/life/claim-pack" icon="briefcase" title="Family claim pack" detail="Keep essential information together" />
      </div>
      <BillsCard>
        <BillsSectionTitle icon="calendar" title="Life-event review prompt" detail="Review cover and beneficiaries after marriage, separation, a new child or another major change." />
        <button type="button" onClick={() => void addReviewReminder()} className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]">Set annual review reminder</button>
        {message ? <p role="status" className="mt-3 text-xs font-semibold text-[#52705a]">{message}</p> : null}
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction href="/office/insurance/compare" icon="chart" title="Renewal comparison" detail="Compare amounts you previously confirmed" />
        <BillsAction href="/family" icon="users" title="Trusted access" detail="Manage existing household permissions" />
      </div>
      <LifeInsuranceNotice />
    </BillsShell>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs"><span className="text-[#667068]">{label}</span><strong className="text-[#20352a]">{value}</strong></div>;
}
