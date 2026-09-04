"use client";

import Link from "next/link";
import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { formatMoney } from "@/lib/bill-records";
import {
  policyAnnualPremium,
  policyMonthlyPremium,
} from "@/lib/insurance-records";
import {
  InsuranceNotice,
  insuranceDaysUntil,
  PolicyRow,
} from "./insurance-shared";

export function InsuranceDashboard() {
  const { state, hydrated } = useDiaryDockData();
  if (!hydrated)
    return (
      <BillsShell>
        <div className="rounded-[28px] bg-white/70 p-8 text-sm text-[#667068]">
          Opening your insurance hub…
        </div>
      </BillsShell>
    );
  const policies = state.insurance.policies.filter(
    (policy) => policy.reviewStatus === "reviewed",
  );
  const active = policies.filter((policy) => policy.status === "active");
  const renewals = active
    .filter(
      (policy) =>
        insuranceDaysUntil(policy.renewalDate) >= 0 &&
        insuranceDaysUntil(policy.renewalDate) <= 30,
    )
    .sort(
      (a, b) =>
        insuranceDaysUntil(a.renewalDate) - insuranceDaysUntil(b.renewalDate),
    );
  const activeClaims = state.insurance.claims.filter(
    (claim) => !["settled", "closed"].includes(claim.status),
  );
  const inbox = state.insurance.policies.filter(
    (policy) => policy.reviewStatus === "needs-review",
  );
  const alerts = active.filter(
    (policy) =>
      (policy.type === "Life" ||
        policy.type === "Income protection" ||
        policy.type === "Critical illness") &&
      !policy.beneficiaries.trim(),
  ).length;
  return (
    <BillsShell>
      <BillsHeader
        title="Insurance Hub"
        subtitle="Keep home and personal protection policies, renewals and claims organised in one calm place."
        backHref="/room/office"
      />
      <BillsCard className="bg-[#355540] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
              Your insurance overview
            </p>
            <h2 className="mt-1 text-xl font-semibold">Policies at a glance</h2>
          </div>
          <UiIcon name="shield" className="h-5 w-5 text-white/75" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{active.length}</p>
            <p className="text-[11px] text-white/70">Active policies</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{renewals.length}</p>
            <p className="text-[11px] text-white/70">Renewals in 30 days</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">
              {formatMoney(
                active.reduce(
                  (sum, policy) => sum + policyMonthlyPremium(policy),
                  0,
                ),
              )}
            </p>
            <p className="text-[11px] text-white/70">Monthly equivalent</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{activeClaims.length}</p>
            <p className="text-[11px] text-white/70">Claims in progress</p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between gap-4">
          <BillsSectionTitle
            icon="chart"
            title="Annual premium total"
            detail="Across active policies you confirmed"
          />
          <span className="text-xl font-semibold text-[#20352a]">
            {formatMoney(
              active.reduce(
                (sum, policy) => sum + policyAnnualPremium(policy),
                0,
              ),
            )}
          </span>
        </div>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between">
          <BillsSectionTitle
            icon="calendar"
            title="Renewals due soon"
            detail={
              renewals.length
                ? `${renewals.length} in the next 30 days`
                : "No upcoming renewals recorded"
            }
          />
          <Link
            href="/office/insurance/policies"
            className="text-xs font-semibold text-[#52705a]"
          >
            See all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {renewals.length ? (
            renewals
              .slice(0, 3)
              .map((policy) => <PolicyRow key={policy.id} policy={policy} />)
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-[12px] text-[#667068]">
              Confirmed policies with renewal dates will appear here.
            </p>
          )}
        </div>
        <Link
          href="/office/insurance/new"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add or upload policy
        </Link>
      </BillsCard>
      {alerts || inbox.length ? (
        <BillsCard>
          <BillsSectionTitle
            icon="alert"
            title="Things to review"
            detail="Prompts based on information you have saved"
          />
          <div className="mt-4 space-y-2">
            {inbox.length ? (
              <Link
                href="/office/insurance/review"
                className="flex min-h-12 items-center justify-between rounded-[14px] bg-[#f4ead7] px-3 text-xs font-semibold text-[#735f3e]"
              >
                {inbox.length} uploaded polic
                {inbox.length === 1 ? "y needs" : "ies need"} checking
                <UiIcon name="chevron-right" className="h-4 w-4" />
              </Link>
            ) : null}
            {alerts ? (
              <Link
                href="/office/insurance/review"
                className="flex min-h-12 items-center justify-between rounded-[14px] bg-[#f7e4df] px-3 text-xs font-semibold text-[#80493f]"
              >
                {alerts} personal protection polic
                {alerts === 1 ? "y has" : "ies have"} no beneficiary note
                <UiIcon name="chevron-right" className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </BillsCard>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/insurance/policies"
          icon="folder"
          title="All your policies"
          detail="Browse confirmed policies"
          badge={`${policies.length}`}
        />
        <BillsAction
          href="/office/insurance/review"
          icon="check"
          title="Cover review"
          detail="Check gaps, overlaps and documents"
        />
        <BillsAction
          href="/office/insurance/compare"
          icon="chart"
          title="Renewal comparison"
          detail="Compare amounts you confirmed"
        />
        <BillsAction
          href="/office/insurance/claims"
          icon="briefcase"
          title="Claims centre"
          detail="Record claims and evidence"
          badge={`${activeClaims.length}`}
        />
      </div>
      <BillsCard>
        <BillsSectionTitle
          icon="users"
          title="Trusted people"
          detail="Policy access is controlled through your existing household permissions."
        />
        <Link
          href="/family"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#45604d]"
        >
          <UiIcon name="shield" className="h-4 w-4" />
          Open trusted-person settings
        </Link>
      </BillsCard>
      <InsuranceNotice />
    </BillsShell>
  );
}
