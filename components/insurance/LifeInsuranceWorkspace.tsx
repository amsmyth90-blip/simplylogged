"use client";

import Link from "next/link";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { formatBillDate, formatMoney } from "@/lib/bill-records";
import type {
  LifeBeneficiary,
  LifePolicyDetails,
} from "@/lib/insurance-records";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

type LifeInsuranceView = "dashboard" | "cover" | "beneficiaries" | "claim-pack";

function LifeInsuranceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock organises life-insurance information and family guidance. It
      does not assess suitability, interpret policy wording, provide financial
      or legal advice, or submit claims. Always check the original policy and
      speak to an appropriate professional when needed.
    </p>
  );
}

function useLifePolicy() {
  const { state } = useDiaryDockData();
  return (
    state.insurance.policies.find(
      (policy) =>
        policy.type === "Life" &&
        policy.reviewStatus === "reviewed" &&
        policy.status === "active",
    ) ??
    state.insurance.policies.find(
      (policy) => policy.type === "Life" && policy.reviewStatus === "reviewed",
    )
  );
}

function defaultDetails(policyId: string): LifePolicyDetails {
  return {
    policyId,
    coveredPerson: "",
    coverAmount: 0,
    coverType: "lump-sum",
    termEndDate: "",
    criticalIllnessIncluded: false,
    criticalIllnessAmount: 0,
    exclusions: "",
    claimsPhone: "",
    adviserName: "",
    adviserPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    inTrust: false,
    trustName: "",
    trusteeNames: "",
    familyGuidance: "",
    lastReviewedAt: "",
  };
}

function NoLifePolicy() {
  return (
    <>
      <BillsCard>
        <div className="rounded-[20px] bg-[#f6f5ef] px-5 py-8 text-center">
          <UiIcon name="heart" className="mx-auto h-9 w-9 text-[#6f8e72]" />
          <h2 className="mt-3 text-lg font-semibold text-[#20352a]">
            Add your life policy first
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-5 text-[#667068]">
            Upload or enter a life-insurance policy and confirm its details
            before recording beneficiaries or preparing family guidance.
          </p>
          <Link
            href="/office/insurance/new"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] px-5 text-sm font-semibold text-white"
          >
            Add life policy
          </Link>
        </div>
      </BillsCard>
      <LifeInsuranceNotice />
    </>
  );
}

function Dashboard() {
  const { state, hydrated, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const [message, setMessage] = useState("");

  if (!hydrated)
    return (
      <BillsShell>
        <div className="rounded-[28px] bg-white/70 p-8 text-sm text-[#667068]">
          Opening life insurance…
        </div>
      </BillsShell>
    );
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Life Insurance"
          subtitle="Protect the people you love by keeping the information they may need organised."
          backHref="/office/insurance"
        />
        <NoLifePolicy />
      </BillsShell>
    );

  const details =
    state.insurance.lifePolicyDetails.find(
      (item) => item.policyId === policy.id,
    ) ?? defaultDetails(policy.id);
  const beneficiaries = state.insurance.lifeBeneficiaries.filter(
    (item) => item.policyId === policy.id,
  );

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
      repeat: "Annual",
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Annual life-policy review reminder added.");
  };

  return (
    <BillsShell>
      <BillsHeader
        title="Life Insurance"
        subtitle="Keep your policy, beneficiaries and family claim information organised and easy to find."
        backHref="/office/insurance"
      />
      <BillsCard>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#eef2e9] text-[#52705a]">
            <UiIcon name="shield" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#20352a]">
                  {policy.title}
                </h2>
                <p className="mt-0.5 text-[11px] text-[#667068]">
                  {policy.provider}
                </p>
              </div>
              <span className="rounded-full bg-[#e6efe1] px-2.5 py-1 text-[9px] font-semibold capitalize text-[#45604d]">
                {policy.status}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
              <p className="text-[#667068]">
                Policy number{" "}
                <strong className="float-right text-[#20352a]">
                  {policy.policyNumberMasked || "Not recorded"}
                </strong>
              </p>
              <p className="text-[#667068]">
                Started{" "}
                <strong className="float-right text-[#20352a]">
                  {formatBillDate(policy.startDate)}
                </strong>
              </p>
            </div>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="heart"
          title="Policy at a glance"
          detail="Confirmed policy details and family records"
        />
        <div className="mt-4 space-y-2">
          <div className="flex justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
            <span className="text-[#667068]">Cover amount</span>
            <strong className="text-[#20352a]">
              {details.coverAmount
                ? formatMoney(details.coverAmount)
                : "Not recorded"}
            </strong>
          </div>
          <div className="flex justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
            <span className="text-[#667068]">Premium</span>
            <strong className="text-[#20352a]">
              {formatMoney(policy.premium)}/
              {policy.premiumFrequency === "monthly"
                ? "mo"
                : policy.premiumFrequency === "annual"
                  ? "yr"
                  : "once"}
            </strong>
          </div>
          <div className="flex justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
            <span className="text-[#667068]">Renewal date</span>
            <strong className="text-[#20352a]">
              {formatBillDate(policy.renewalDate)}
            </strong>
          </div>
          <div className="flex justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
            <span className="text-[#667068]">Term ends</span>
            <strong className="text-[#20352a]">
              {formatBillDate(details.termEndDate)}
            </strong>
          </div>
          <div className="flex justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs">
            <span className="text-[#667068]">Beneficiaries</span>
            <strong className="text-[#20352a]">{beneficiaries.length}</strong>
          </div>
        </div>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href={`/office/insurance/${policy.id}`}
          icon="file"
          title="Policy documents"
          detail="View the policy record and original file"
        />
        <BillsAction
          href="/office/insurance/life/cover"
          icon="shield"
          title="Cover summary"
          detail="Plain-language cover information"
        />
        <BillsAction
          href="/office/insurance/life/beneficiaries"
          icon="users"
          title="Beneficiaries & family"
          detail="Record percentage splits and trust notes"
        />
        <BillsAction
          href="/office/insurance/life/claim-pack"
          icon="briefcase"
          title="Family claim pack"
          detail="Keep essential information together"
        />
      </div>
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Life-event review prompt"
          detail="Review cover and beneficiaries after marriage, separation, a new child or another major change."
        />
        <button
          type="button"
          onClick={() => void addReviewReminder()}
          className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Set annual review reminder
        </button>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/insurance/compare"
          icon="chart"
          title="Renewal comparison"
          detail="Compare amounts you previously confirmed"
        />
        <BillsAction
          href="/family"
          icon="users"
          title="Trusted access"
          detail="Manage existing household permissions"
        />
      </div>
      <LifeInsuranceNotice />
    </BillsShell>
  );
}

function CoverSummary() {
  const { state, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const stored = policy
    ? state.insurance.lifePolicyDetails.find(
        (item) => item.policyId === policy.id,
      )
    : undefined;
  const [draft, setDraft] = useState<LifePolicyDetails>(
    () => stored ?? defaultDetails(policy?.id ?? ""),
  );
  const [saved, setSaved] = useState(false);
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Cover Summary"
          subtitle="Record a plain-language view of your life policy."
          backHref="/office/insurance/life"
        />
        <NoLifePolicy />
      </BillsShell>
    );

  const save = () => {
    const updated = {
      ...draft,
      policyId: policy.id,
      lastReviewedAt: new Date().toISOString(),
    };
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifePolicyDetails: [
          updated,
          ...current.insurance.lifePolicyDetails.filter(
            (item) => item.policyId !== policy.id,
          ),
        ],
      },
    }));
    setDraft(updated);
    setSaved(true);
  };

  return (
    <BillsShell>
      <BillsHeader
        title="Cover Summary"
        subtitle="Record what the policy says in clear, practical terms."
        backHref="/office/insurance/life"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="heart"
          title="Who and what is covered"
          detail="Copy important details from the original policy and verify them before saving."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Person covered
            <input
              value={draft.coveredPerson}
              onChange={(e) =>
                setDraft({ ...draft, coveredPerson: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Cover amount (£)
            <input
              type="number"
              min="0"
              value={draft.coverAmount || ""}
              onChange={(e) =>
                setDraft({ ...draft, coverAmount: Number(e.target.value) })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Cover type
            <select
              value={draft.coverType}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  coverType: e.target.value as LifePolicyDetails["coverType"],
                })
              }
              className={fieldClass}
            >
              <option value="lump-sum">Lump sum</option>
              <option value="family-income">Family income</option>
              <option value="decreasing">Decreasing cover</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Term ends
            <input
              type="date"
              value={draft.termEndDate}
              onChange={(e) =>
                setDraft({ ...draft, termEndDate: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
            <input
              type="checkbox"
              checked={draft.criticalIllnessIncluded}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  criticalIllnessIncluded: e.target.checked,
                })
              }
              className="h-4 w-4 accent-[#45604d]"
            />
            Critical illness cover included
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Critical illness amount (£)
            <input
              type="number"
              min="0"
              value={draft.criticalIllnessAmount || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  criticalIllnessAmount: Number(e.target.value),
                })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Important exclusions
            <textarea
              rows={4}
              value={draft.exclusions}
              onChange={(e) =>
                setDraft({ ...draft, exclusions: e.target.value })
              }
              className={fieldClass}
              placeholder="Record wording to double-check in the original policy."
            />
          </label>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="phone"
          title="Claim and adviser contacts"
          detail="Keep practical contact details where your family can find them."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Claims phone
            <input
              value={draft.claimsPhone}
              onChange={(e) =>
                setDraft({ ...draft, claimsPhone: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Adviser name
            <input
              value={draft.adviserName}
              onChange={(e) =>
                setDraft({ ...draft, adviserName: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Adviser phone
            <input
              value={draft.adviserPhone}
              onChange={(e) =>
                setDraft({ ...draft, adviserPhone: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Emergency contact
            <input
              value={draft.emergencyContactName}
              onChange={(e) =>
                setDraft({ ...draft, emergencyContactName: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Emergency contact phone
            <input
              value={draft.emergencyContactPhone}
              onChange={(e) =>
                setDraft({ ...draft, emergencyContactPhone: e.target.value })
              }
              className={fieldClass}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-5 min-h-12 w-full rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white"
        >
          Save cover summary
        </button>
        {saved ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            Cover summary saved.
          </p>
        ) : null}
      </BillsCard>
      <Link
        href={`/office/insurance/${policy.id}`}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
      >
        View full policy wording
      </Link>
      <LifeInsuranceNotice />
    </BillsShell>
  );
}

function Beneficiaries() {
  const { state, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const storedDetails = policy
    ? state.insurance.lifePolicyDetails.find(
        (item) => item.policyId === policy.id,
      )
    : undefined;
  const [trust, setTrust] = useState<LifePolicyDetails>(
    () => storedDetails ?? defaultDetails(policy?.id ?? ""),
  );
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    relationship: "",
    percentage: 0,
    primary: false,
    notes: "",
  });
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Beneficiaries & Family"
          subtitle="Keep beneficiary and trust notes organised."
          backHref="/office/insurance/life"
        />
        <NoLifePolicy />
      </BillsShell>
    );
  const beneficiaries = state.insurance.lifeBeneficiaries.filter(
    (item) => item.policyId === policy.id,
  );
  const total = beneficiaries.reduce((sum, item) => sum + item.percentage, 0);
  const householdNames = Array.from(
    new Set([
      ...state.householdMembers.map((member) => member.name),
      ...state.householdProfiles.map((profile) => profile.name),
    ]),
  ).filter(Boolean);

  const addBeneficiary = () => {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const beneficiary: LifeBeneficiary = {
      id: crypto.randomUUID(),
      policyId: policy.id,
      ...draft,
      createdAt: now,
      updatedAt: now,
    };
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifeBeneficiaries: [
          beneficiary,
          ...current.insurance.lifeBeneficiaries,
        ],
      },
    }));
    setDraft({
      name: "",
      relationship: "",
      percentage: 0,
      primary: false,
      notes: "",
    });
    setShowForm(false);
  };
  const removeBeneficiary = (id: string) =>
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifeBeneficiaries: current.insurance.lifeBeneficiaries.filter(
          (item) => item.id !== id,
        ),
      },
    }));
  const toggleLinkedPerson = (name: string) =>
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        policies: current.insurance.policies.map((item) =>
          item.id === policy.id
            ? {
                ...item,
                linkedPeople: item.linkedPeople.includes(name)
                  ? item.linkedPeople.filter((person) => person !== name)
                  : [...item.linkedPeople, name],
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      },
    }));
  const saveTrust = () => {
    const updated = {
      ...trust,
      policyId: policy.id,
      lastReviewedAt: new Date().toISOString(),
    };
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifePolicyDetails: [
          updated,
          ...current.insurance.lifePolicyDetails.filter(
            (item) => item.policyId !== policy.id,
          ),
        ],
      },
    }));
    setTrust(updated);
  };

  return (
    <BillsShell>
      <BillsHeader
        title="Beneficiaries & Family"
        subtitle="Record who is named, percentage notes and the people connected with this policy."
        backHref="/office/insurance/life"
      />
      <BillsCard>
        <div className="flex items-center justify-between gap-3">
          <BillsSectionTitle
            icon="users"
            title="Beneficiaries"
            detail={`${beneficiaries.length} recorded · total ${total}%`}
          />
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            aria-label="Add beneficiary"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f5140] text-white"
          >
            <UiIcon name="plus" className="h-5 w-5" />
          </button>
        </div>
        {total !== 100 && beneficiaries.length ? (
          <p className="mt-4 rounded-[14px] bg-[#f4ead7] px-3 py-3 text-xs leading-5 text-[#735f3e]">
            The percentages recorded here total {total}%. Check them against the
            insurer or trust documents.
          </p>
        ) : null}
        {showForm ? (
          <div className="mt-4 rounded-[18px] bg-[#f6f5ef] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#667068]">
                Name
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Relationship
                <input
                  value={draft.relationship}
                  onChange={(e) =>
                    setDraft({ ...draft, relationship: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Percentage
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draft.percentage || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      percentage: Math.min(100, Number(e.target.value)),
                    })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]">
                <input
                  type="checkbox"
                  checked={draft.primary}
                  onChange={(e) =>
                    setDraft({ ...draft, primary: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#45604d]"
                />
                Primary beneficiary
              </label>
            </div>
            <button
              type="button"
              onClick={addBeneficiary}
              className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
            >
              Save beneficiary note
            </button>
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          {beneficiaries.length ? (
            beneficiaries.map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-[16px] border border-[#20352a]/[0.07] bg-white p-3"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef2e9] text-[#52705a]">
                  <UiIcon name="users" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#20352a]">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-[#667068]">
                    {item.relationship || "Relationship not recorded"}
                    {item.primary ? " · Primary" : ""}
                  </span>
                </span>
                <strong className="text-sm text-[#20352a]">
                  {item.percentage}%
                </strong>
                <button
                  type="button"
                  onClick={() => removeBeneficiary(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#8a5145]"
                >
                  <UiIcon name="plus" className="h-4 w-4 rotate-45" />
                </button>
              </article>
            ))
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">
              No beneficiary notes recorded.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="lock"
          title="Trust details"
          detail="Record factual information from your trust paperwork; DiaryDock does not create or validate a trust."
        />
        <label className="mt-4 flex min-h-11 items-center gap-3 rounded-[14px] bg-[#f6f5ef] px-3 text-sm text-[#20352a]">
          <input
            type="checkbox"
            checked={trust.inTrust}
            onChange={(e) => setTrust({ ...trust, inTrust: e.target.checked })}
            className="h-4 w-4 accent-[#45604d]"
          />
          Policy recorded as held in trust
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Trust name
            <input
              value={trust.trustName}
              onChange={(e) =>
                setTrust({ ...trust, trustName: e.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Trustees
            <input
              value={trust.trusteeNames}
              onChange={(e) =>
                setTrust({ ...trust, trusteeNames: e.target.value })
              }
              className={fieldClass}
              placeholder="Names separated by commas"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={saveTrust}
          className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Save trust notes
        </button>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="users"
          title="People linked to this policy"
          detail="Linking helps organisation only; it does not grant policy or document access."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {householdNames.length ? (
            householdNames.map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => toggleLinkedPerson(name)}
                className={`min-h-10 rounded-full px-3 text-xs font-semibold ${policy.linkedPeople.includes(name) ? "bg-[#355540] text-white" : "bg-[#f0f2e9] text-[#52705a]"}`}
              >
                {name}
              </button>
            ))
          ) : (
            <p className="text-xs text-[#667068]">
              Add household profiles to link people.
            </p>
          )}
        </div>
        <Link
          href="/family"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#45604d]"
        >
          <UiIcon name="shield" className="h-4 w-4" />
          Manage actual access
        </Link>
      </BillsCard>
      <LifeInsuranceNotice />
    </BillsShell>
  );
}

function ClaimPack() {
  const { state, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const stored = policy
    ? state.insurance.lifePolicyDetails.find(
        (item) => item.policyId === policy.id,
      )
    : undefined;
  const [guidance, setGuidance] = useState(stored?.familyGuidance ?? "");
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Family Claim Pack"
          subtitle="Organise essential information for your family."
          backHref="/office/insurance/life"
        />
        <NoLifePolicy />
      </BillsShell>
    );
  const details = stored ?? defaultDetails(policy.id);
  const beneficiaries = state.insurance.lifeBeneficiaries.filter(
    (item) => item.policyId === policy.id,
  );
  const saveGuidance = () => {
    const updated = {
      ...details,
      familyGuidance: guidance,
      lastReviewedAt: new Date().toISOString(),
    };
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifePolicyDetails: [
          updated,
          ...current.insurance.lifePolicyDetails.filter(
            (item) => item.policyId !== policy.id,
          ),
        ],
      },
    }));
  };
  const required = [
    {
      label: "Policy number",
      ready: Boolean(policy.policyNumberMasked),
      value: policy.policyNumberMasked,
    },
    {
      label: "Provider",
      ready: Boolean(policy.provider),
      value: policy.provider,
    },
    {
      label: "Claims phone",
      ready: Boolean(details.claimsPhone),
      value: details.claimsPhone,
    },
    {
      label: "Cover amount",
      ready: Boolean(details.coverAmount),
      value: details.coverAmount ? formatMoney(details.coverAmount) : "",
    },
    {
      label: "Beneficiary notes",
      ready: beneficiaries.length > 0,
      value: beneficiaries.length ? `${beneficiaries.length} recorded` : "",
    },
    {
      label: "Trust details",
      ready:
        !details.inTrust || Boolean(details.trustName && details.trusteeNames),
      value: details.inTrust ? details.trustName : "Not recorded as in trust",
    },
  ];

  return (
    <BillsShell>
      <BillsHeader
        title="Family Claim Pack"
        subtitle="Keep the practical information your loved ones may need together."
        backHref="/office/insurance/life"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="file"
          title="Essential information"
          detail={`${required.filter((item) => item.ready).length} of ${required.length} items ready`}
        />
        <div className="mt-4 space-y-2">
          {required.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs"
            >
              <UiIcon
                name={item.ready ? "check" : "alert"}
                className={`h-4 w-4 shrink-0 ${item.ready ? "text-[#52705a]" : "text-[#9a584a]"}`}
              />
              <span className="min-w-0 flex-1 text-[#667068]">
                {item.label}
              </span>
              <strong className="max-w-[48%] truncate text-right text-[#20352a]">
                {item.value || "Not recorded"}
              </strong>
            </div>
          ))}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="folder"
          title="Documents your family may need"
          detail="The insurer will confirm its exact requirements."
        />
        <ul className="mt-4 space-y-2 text-xs text-[#667068]">
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Original policy document and schedule
          </li>
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Proof of identity requested by the insurer
          </li>
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Death certificate or other evidence requested
          </li>
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Trust documents, where applicable
          </li>
        </ul>
        <Link
          href={`/office/insurance/${policy.id}`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#45604d]"
        >
          <UiIcon name="file" className="h-4 w-4" />
          Open policy documents
        </Link>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="heart"
          title="Family guidance"
          detail="Practical notes only — not instructions that alter the policy, trust or a will."
        />
        <textarea
          rows={6}
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          className={fieldClass}
          placeholder="Where the original is kept, who to contact first, adviser details…"
        />
        <button
          type="button"
          onClick={saveGuidance}
          className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
        >
          Save family guidance
        </button>
      </BillsCard>
      {details.emergencyContactName || details.emergencyContactPhone ? (
        <BillsCard className="bg-[#f4ead7]">
          <BillsSectionTitle
            icon="phone"
            title="Emergency contact"
            detail={details.emergencyContactName || "Name not recorded"}
          />
          {details.emergencyContactPhone ? (
            <a
              href={`tel:${details.emergencyContactPhone}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-white px-4 text-sm font-semibold text-[#45604d]"
            >
              <UiIcon name="phone" className="h-4 w-4" />
              Call {details.emergencyContactPhone}
            </a>
          ) : null}
        </BillsCard>
      ) : null}
      <LifeInsuranceNotice />
    </BillsShell>
  );
}

export function LifeInsuranceWorkspace({ view }: { view: LifeInsuranceView }) {
  if (view === "cover") return <CoverSummary />;
  if (view === "beneficiaries") return <Beneficiaries />;
  if (view === "claim-pack") return <ClaimPack />;
  return <Dashboard />;
}
