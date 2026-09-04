"use client";

import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell
} from "@/components/bills/BillsUi";
import { formatBillDate, formatMoney } from "@/lib/bill-records";

import { HomeInsuranceNotice, NoHomePolicy, useHomePolicy } from "./home-insurance-shared";

export function HomeInsuranceDashboard() {
  const { state, hydrated } = useDiaryDockData();
  const policy = useHomePolicy();
  if (!hydrated) {
    return <BillsShell><div className="rounded-[28px] bg-white/70 p-8 text-sm text-[#667068]">Opening home insurance…</div></BillsShell>;
  }
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="Home Insurance" subtitle="Protect your home, belongings and peace of mind by keeping the information you rely on organised." backHref="/office/insurance" />
        <NoHomePolicy />
      </BillsShell>
    );
  }
  const items = state.insurance.homeInventory.filter(item => item.policyId === policy.id);
  const inventoryTotal = items.reduce((sum, item) => sum + item.estimatedValue * item.quantity, 0);
  const claims = state.insurance.claims.filter(claim => claim.policyId === policy.id);
  const included = policy.coverItems.filter(item => item.included);
  return (
    <BillsShell>
      <BillsHeader title="Home Insurance" subtitle="Your policy details, documents, home inventory and claims in one secure place." backHref="/office/insurance" />
      <BillsCard>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#f1ead7] text-[#a06b24]"><UiIcon name="home" className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div><h2 className="text-base font-semibold text-[#20352a]">{policy.title}</h2><p className="mt-0.5 text-[11px] text-[#667068]">{policy.provider}</p></div>
              <span className="rounded-full bg-[#e6efe1] px-2.5 py-1 text-[9px] font-semibold text-[#45604d]">{policy.status}</span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
              <p className="text-[#667068]">Policy number <strong className="float-right text-[#20352a]">{policy.policyNumberMasked || "Not recorded"}</strong></p>
              <p className="text-[#667068]">Renews <strong className="float-right text-[#20352a]">{formatBillDate(policy.renewalDate)}</strong></p>
            </div>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="shield" title="Policy at a glance" detail="Confirmed information from your policy record" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <PolicyFigure label="Premium">
            {formatMoney(policy.premium)}<span className="text-[9px] font-normal">/{policy.premiumFrequency === "monthly" ? "mo" : policy.premiumFrequency === "annual" ? "yr" : "once"}</span>
          </PolicyFigure>
          <PolicyFigure label="Excess">{formatMoney(policy.excess)}</PolicyFigure>
          {included.slice(0, 2).map(item => (
            <div key={item.id} className="rounded-[15px] bg-[#f6f5ef] p-3">
              <p className="truncate text-[10px] text-[#667068]">{item.label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#20352a]">{item.value}</p>
            </div>
          ))}
        </div>
        <Link href="/office/insurance/home/cover" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white">View cover details</Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction href={`/office/insurance/${policy.id}`} icon="file" title="Policy documents" detail="Open details and original policy" />
        <BillsAction href="/office/insurance/compare" icon="chart" title="Renewal comparison" detail="Compare confirmed renewal figures" />
        <BillsAction href="/office/insurance/home/inventory" icon="archive" title="Home inventory" detail={`${items.length} item${items.length === 1 ? "" : "s"} · ${formatMoney(inventoryTotal)}`} />
        <BillsAction href="/office/insurance/home/claim" icon="briefcase" title="Make a claim record" detail="Prepare details and a claim checklist" />
      </div>
      <BillsCard>
        <BillsSectionTitle icon="clock" title="Recent home insurance activity" detail="Based on information stored in DiaryDock" />
        <div className="mt-4 space-y-2">
          {items.slice(0, 2).map(item => (
            <p key={item.id} className="flex items-center justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
              <span className="font-semibold text-[#20352a]">{item.name} added</span>
              <span className="text-[#667068]">{formatMoney(item.estimatedValue * item.quantity)}</span>
            </p>
          ))}
          {claims.slice(0, 2).map(claim => (
            <p key={claim.id} className="flex items-center justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
              <span className="font-semibold text-[#20352a]">{claim.title}</span>
              <span className="capitalize text-[#667068]">{claim.status.replace("-", " ")}</span>
            </p>
          ))}
          {!items.length && !claims.length ? <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">Activity will appear as you add inventory items and claim records.</p> : null}
        </div>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction href="/office/insurance/home/check" icon="check" title="Cover checker" detail="Review recorded values and policy limits" />
        <BillsAction href="/office/insurance/home/high-value" icon="star" title="High-value items" detail="Keep valuable belongings easy to review" />
        <BillsAction href="/office/insurance/claims" icon="clock" title="Claims history" detail={`${claims.length} home claim${claims.length === 1 ? "" : "s"} recorded`} />
        <BillsAction href="/family" icon="users" title="Trusted access" detail="Manage existing household permissions" />
      </div>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

function PolicyFigure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[15px] bg-[#f6f5ef] p-3">
      <p className="text-[10px] text-[#667068]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#20352a]">{children}</p>
    </div>
  );
}
