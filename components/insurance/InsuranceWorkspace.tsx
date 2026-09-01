"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

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
import {
  analysePrivateDocument,
  openPrivateDocument,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { InsuranceDocumentAnalysis } from "@/lib/insurance-document-analysis";
import {
  officeInsuranceTypes,
  policyAnnualPremium,
  policyMonthlyPremium,
  type ClaimStatus,
  type InsuranceClaim,
  type InsurancePolicy,
  type OfficeInsuranceType,
  type PolicyStatus,
} from "@/lib/insurance-records";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import {
  daysUntil as sharedDaysUntil,
  documentKind,
  formatFileSize as fileSize,
} from "@/lib/presentation";
import {
  upsertStructuredDocument,
  upsertStructuredReminder,
} from "@/lib/structured-data";

type InsuranceView =
  | "dashboard"
  | "policies"
  | "new"
  | "detail"
  | "claims"
  | "compare"
  | "review";
const policyTone: Record<PolicyStatus, string> = {
  draft: "bg-[#f1eee5] text-[#806b45]",
  active: "bg-[#e6efe1] text-[#45604d]",
  expired: "bg-[#f7e4df] text-[#924a40]",
  cancelled: "bg-[#ececec] text-[#6d716e]",
};
const claimTone: Record<ClaimStatus, string> = {
  draft: "bg-[#f1eee5] text-[#806b45]",
  submitted: "bg-[#e7eee8] text-[#52705a]",
  assessing: "bg-[#e9edf3] text-[#526779]",
  "action-required": "bg-[#f7e4df] text-[#924a40]",
  settled: "bg-[#e6efe1] text-[#45604d]",
  closed: "bg-[#ececec] text-[#6d716e]",
};

function InsuranceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise insurance information and documents. It is
      not an insurer, broker or financial adviser. Check policy wording with
      your provider and seek qualified advice when needed.
    </p>
  );
}
function daysUntil(value: string) {
  return sharedDaysUntil(value, "23:59:59");
}

function PolicyRow({ policy }: { policy: InsurancePolicy }) {
  return (
    <Link
      href={`/office/insurance/${policy.id}`}
      className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon
          name={
            policy.type === "Home"
              ? "home"
              : policy.type === "Life"
                ? "heart"
                : "shield"
          }
          className="h-5 w-5"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {policy.title || policy.provider || "Policy awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {policy.provider || "Provider not confirmed"} ·{" "}
          {policy.renewalDate
            ? `Renews ${formatBillDate(policy.renewalDate)}`
            : "Renewal not recorded"}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-[#20352a]">
          {formatMoney(policy.premium)}
          <span className="text-[9px] font-normal text-[#667068]">
            /
            {policy.premiumFrequency === "monthly"
              ? "mo"
              : policy.premiumFrequency === "annual"
                ? "yr"
                : "once"}
          </span>
        </span>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${policyTone[policy.status]}`}
        >
          {policy.reviewStatus === "needs-review"
            ? "Check details"
            : policy.status}
        </span>
      </span>
    </Link>
  );
}

function Dashboard() {
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
    (p) => p.reviewStatus === "reviewed",
  );
  const active = policies.filter((p) => p.status === "active");
  const renewals = active
    .filter(
      (p) => daysUntil(p.renewalDate) >= 0 && daysUntil(p.renewalDate) <= 30,
    )
    .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate));
  const activeClaims = state.insurance.claims.filter(
    (c) => !["settled", "closed"].includes(c.status),
  );
  const inbox = state.insurance.policies.filter(
    (p) => p.reviewStatus === "needs-review",
  );
  const alerts = active.filter(
    (p) =>
      (p.type === "Life" ||
        p.type === "Income protection" ||
        p.type === "Critical illness") &&
      !p.beneficiaries.trim(),
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
                active.reduce((s, p) => s + policyMonthlyPremium(p), 0),
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
              active.reduce((s, p) => s + policyAnnualPremium(p), 0),
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
            renewals.slice(0, 3).map((p) => <PolicyRow key={p.id} policy={p} />)
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

function Policies() {
  const { state } = useDiaryDockData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const policies = state.insurance.policies
    .filter((p) => p.reviewStatus === "reviewed")
    .filter((p) => type === "All" || p.type === type)
    .filter((p) => status === "All" || p.status === status.toLowerCase())
    .filter((p) =>
      `${p.title} ${p.provider} ${p.type} ${p.policyNumberMasked}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate));
  return (
    <BillsShell>
      <BillsHeader
        title="My Policies"
        subtitle="Search and filter your confirmed home and personal protection policies."
        backHref="/office/insurance"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search policies
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={fieldClass}
            placeholder="Provider, title or policy number"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              {officeInsuranceTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              <option>Active</option>
              <option>Expired</option>
              <option>Cancelled</option>
            </select>
          </label>
        </div>
      </BillsCard>
      <div className="space-y-3">
        {policies.length ? (
          policies.map((p) => <PolicyRow key={p.id} policy={p} />)
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No policies match this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/insurance/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add or upload policy
      </Link>
    </BillsShell>
  );
}

function NewPolicy() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const blank = (partial: Partial<InsurancePolicy> = {}) => {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title: "",
      type: "Home" as OfficeInsuranceType,
      provider: "",
      policyNumberMasked: "",
      status: "draft" as PolicyStatus,
      reviewStatus: "needs-review" as const,
      startDate: "",
      renewalDate: "",
      premium: 0,
      premiumFrequency: "annual" as const,
      autoRenew: false,
      coverSummary: "",
      coverItems: [],
      excess: 0,
      providerPhone: "",
      providerEmail: "",
      linkedPeople: [],
      linkedAsset: "",
      beneficiaries: "",
      notes: "",
      history: [],
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
  };
  const manual = () => {
    const policy = blank();
    updateState((c) => ({
      ...c,
      insurance: {
        ...c.insurance,
        policies: [policy, ...c.insurance.policies],
      },
    }));
    router.push(`/office/insurance/${policy.id}`);
  };
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const payload = await analysePrivateDocument<{
        insuranceAnalysis?: InsuranceDocumentAnalysis;
        error?: string;
      }>(stored, "insurance");
      const a = payload.insuranceAnalysis;
      const now = new Date().toISOString();
      const doc: VaultDocument = {
        id,
        title: a?.title || file.name,
        category: "Home & Property",
        kind: documentKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        issuer: a?.provider,
        dueDate: a?.renewalDate,
        extractionSummary: a?.coverSummary,
        extractedText: a?.extractedText,
        reviewStatus: "needs-review",
        reviewReasons: a?.reviewReasons ?? [
          payload.error ||
            "The policy could not be read automatically. Enter and check the details manually.",
        ],
      };
      const policy = blank({
        id,
        documentId: id,
        title: a?.title || "",
        type: a?.type || "Home",
        provider: a?.provider || "",
        policyNumberMasked: a?.policyNumberMasked || "",
        startDate: a?.startDate || "",
        renewalDate: a?.renewalDate || "",
        premium: a?.premium || 0,
        premiumFrequency: a?.premiumFrequency || "annual",
        autoRenew: a?.autoRenew || false,
        coverSummary: a?.coverSummary || "",
        coverItems: [
          ...(a?.includedCover || []).map((label) => ({
            id: crypto.randomUUID(),
            label,
            value: "Included",
            included: true,
          })),
          ...(a?.excludedCover || []).map((label) => ({
            id: crypto.randomUUID(),
            label,
            value: "Not included",
            included: false,
          })),
        ],
        excess: a?.excess || 0,
        providerPhone: a?.providerPhone || "",
        providerEmail: a?.providerEmail || "",
        notes: a?.reviewReasons.join(" · ") || "",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        createdAt: now,
        updatedAt: now,
      });
      updateState((c) => ({
        ...c,
        vaultDocuments: [doc, ...c.vaultDocuments.filter((d) => d.id !== id)],
        insurance: {
          ...c.insurance,
          policies: [
            policy,
            ...c.insurance.policies.filter((p) => p.id !== id),
          ],
        },
      }));
      await upsertStructuredDocument(doc);
      router.push(`/office/insurance/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add this policy.",
      );
      setWorking(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Add a Policy"
        subtitle="Upload a policy for a helpful first read, or enter the details yourself."
        backHref="/office/insurance"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Upload a policy document"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 4 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center">
          <UiIcon name="plus" className="h-8 w-8 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working
              ? "Securely storing and reading…"
              : "Choose a policy document"}
          </span>
          <span className="mt-1 text-[11px] text-[#667068]">
            Nothing is confirmed until you review it.
          </span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={upload}
            disabled={working}
            className="sr-only"
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#8c493f]"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={manual}
          disabled={working}
          className="mt-4 min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Enter details manually
        </button>
      </BillsCard>
      <InsuranceNotice />
    </BillsShell>
  );
}

function PolicyDetail({ policyId }: { policyId: string }) {
  const { state, updateState } = useDiaryDockData();
  const policy = state.insurance.policies.find((p) => p.id === policyId);
  const [draft, setDraft] = useState<InsurancePolicy | undefined>(policy);
  const [message, setMessage] = useState("");
  if (!policy || !draft)
    return (
      <BillsShell>
        <BillsHeader
          title="Policy not found"
          subtitle="This policy is not available in this account."
          backHref="/office/insurance"
        />
      </BillsShell>
    );
  const update = <K extends keyof InsurancePolicy>(
    key: K,
    value: InsurancePolicy[K],
  ) => setDraft({ ...draft, [key]: value });
  const save = async () => {
    if (!draft.title.trim() && !draft.provider.trim()) {
      setMessage("Add a policy title or provider before confirming.");
      return;
    }
    const changed =
      policy.reviewStatus === "reviewed" &&
      (policy.premium !== draft.premium ||
        policy.excess !== draft.excess ||
        policy.renewalDate !== draft.renewalDate);
    const history = changed
      ? [
          ...policy.history,
          {
            id: crypto.randomUUID(),
            premium: draft.premium,
            excess: draft.excess,
            renewalDate: draft.renewalDate,
            recordedAt: new Date().toISOString(),
          },
        ]
      : policy.history.length
        ? policy.history
        : [
            {
              id: crypto.randomUUID(),
              premium: draft.premium,
              excess: draft.excess,
              renewalDate: draft.renewalDate,
              recordedAt: new Date().toISOString(),
            },
          ];
    const updated = {
      ...draft,
      title: draft.title.trim() || `${draft.provider} policy`,
      status: draft.status === "draft" ? ("active" as const) : draft.status,
      reviewStatus: "reviewed" as const,
      history,
      updatedAt: new Date().toISOString(),
    };
    updateState((c) => ({
      ...c,
      insurance: {
        ...c.insurance,
        policies: c.insurance.policies.map((p) =>
          p.id === policyId ? updated : p,
        ),
      },
      vaultDocuments: c.vaultDocuments.map((d) =>
        d.id === updated.documentId
          ? {
              ...d,
              title: updated.title,
              issuer: updated.provider,
              dueDate: updated.renewalDate,
              reviewStatus: "reviewed",
              reviewedAt: new Date().toISOString(),
            }
          : d,
      ),
    }));
    const doc = state.vaultDocuments.find((d) => d.id === updated.documentId);
    if (doc)
      await upsertStructuredDocument({
        ...doc,
        title: updated.title,
        issuer: updated.provider,
        dueDate: updated.renewalDate,
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      });
    setDraft(updated);
    setMessage("Policy details saved.");
  };
  const remind = async () => {
    if (!draft.renewalDate) {
      setMessage("Add a renewal date first.");
      return;
    }
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: `Review ${draft.title || draft.provider || "insurance policy"}`,
      note: "Check the renewal quote, cover and exclusions against the original policy documents.",
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatBillDate(draft.renewalDate),
      priority: "normal",
      documentId: draft.documentId,
      documentTitle: draft.title,
      dueDate: draft.renewalDate,
    };
    updateState((c) => ({ ...c, reminders: [reminder, ...c.reminders] }));
    await upsertStructuredReminder(reminder);
    setMessage("Renewal reminder added.");
  };
  const view = async () => {
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to open this policy.",
      );
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title={
          draft.reviewStatus === "needs-review"
            ? "Check policy details"
            : draft.title
        }
        subtitle={
          draft.reviewStatus === "needs-review"
            ? "Compare these details with the original policy before confirming."
            : `${draft.provider} · ${draft.type}`
        }
        backHref="/office/insurance"
      />
      {draft.reviewStatus === "needs-review" ? (
        <p className="rounded-[18px] border border-[#d8c9ad] bg-[#f4ead7] px-4 py-3 text-[12px] leading-5 text-[#6f604a]">
          <strong>Check before saving.</strong> The document summary may contain
          mistakes and does not interpret whether your cover is suitable.
        </p>
      ) : null}
      <BillsCard>
        <BillsSectionTitle
          icon="shield"
          title="Policy details"
          detail="Keep policy numbers masked and verify every amount and date."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Policy title
            <input
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Provider
            <input
              value={draft.provider}
              onChange={(e) => update("provider", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Policy type
            <select
              value={draft.type}
              onChange={(e) =>
                update("type", e.target.value as OfficeInsuranceType)
              }
              className={fieldClass}
            >
              {officeInsuranceTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Policy number (masked)
            <input
              value={draft.policyNumberMasked}
              onChange={(e) => update("policyNumberMasked", e.target.value)}
              className={fieldClass}
              placeholder="•••• 1234"
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Starts
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Renews
            <input
              type="date"
              value={draft.renewalDate}
              onChange={(e) => update("renewalDate", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Premium (£)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.premium || ""}
              onChange={(e) => update("premium", Number(e.target.value))}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Payment frequency
            <select
              value={draft.premiumFrequency}
              onChange={(e) =>
                update(
                  "premiumFrequency",
                  e.target.value as InsurancePolicy["premiumFrequency"],
                )
              }
              className={fieldClass}
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="one-off">One-off</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Excess (£)
            <input
              type="number"
              min="0"
              value={draft.excess || ""}
              onChange={(e) => update("excess", Number(e.target.value))}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Status
            <select
              value={draft.status}
              onChange={(e) => update("status", e.target.value as PolicyStatus)}
              className={fieldClass}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
            <input
              type="checkbox"
              checked={draft.autoRenew}
              onChange={(e) => update("autoRenew", e.target.checked)}
              className="h-4 w-4 accent-[#45604d]"
            />
            Automatically renews
          </label>
        </div>
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Plain-language cover note
          <textarea
            rows={4}
            value={draft.coverSummary}
            onChange={(e) => update("coverSummary", e.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Provider phone
            <input
              value={draft.providerPhone}
              onChange={(e) => update("providerPhone", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Provider email
            <input
              type="email"
              value={draft.providerEmail}
              onChange={(e) => update("providerEmail", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Linked home or asset
            <input
              value={draft.linkedAsset}
              onChange={(e) => update("linkedAsset", e.target.value)}
              className={fieldClass}
              placeholder="For example, family home"
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Beneficiaries or review note
            <input
              value={draft.beneficiaries}
              onChange={(e) => update("beneficiaries", e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void save()}
            className="min-h-12 flex-1 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
          >
            {draft.reviewStatus === "needs-review"
              ? "Confirm and save"
              : "Save changes"}
          </button>
          {draft.storagePath ? (
            <button
              type="button"
              onClick={() => void view()}
              className="min-h-12 flex-1 rounded-[15px] border border-[#6f8e72]/35 px-4 text-sm font-semibold text-[#45604d]"
            >
              View policy document
            </button>
          ) : null}
        </div>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="Cover summary"
          detail="A factual checklist only — not a recommendation about the level of cover."
        />
        <div className="mt-4 space-y-2">
          {draft.coverItems.length ? (
            draft.coverItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-[14px] bg-[#f6f5ef] px-3 py-2.5"
              >
                <UiIcon
                  name={item.included ? "check" : "alert"}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${item.included ? "text-[#52705a]" : "text-[#9a584a]"}`}
                />
                <span className="min-w-0 flex-1 text-xs text-[#20352a]">
                  {item.label}
                </span>
                <span className="text-[11px] text-[#667068]">{item.value}</span>
              </div>
            ))
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#667068]">
              No cover items recorded. Check the original policy document.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Renewal reminder"
          detail="DiaryDock can remind you to review this policy but cannot renew or cancel it."
        />
        <button
          type="button"
          onClick={() => void remind()}
          className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Add renewal reminder
        </button>
      </BillsCard>
      <InsuranceNotice />
    </BillsShell>
  );
}

function Review() {
  const { state } = useDiaryDockData();
  const inbox = state.insurance.policies.filter(
    (p) => p.reviewStatus === "needs-review",
  );
  const active = state.insurance.policies.filter(
    (p) => p.reviewStatus === "reviewed" && p.status === "active",
  );
  const duplicates = officeInsuranceTypes
    .map((type) => ({
      type,
      count: active.filter((p) => p.type === type).length,
    }))
    .filter((x) => x.count > 1);
  const beneficiary = active.filter(
    (p) =>
      (p.type === "Life" ||
        p.type === "Income protection" ||
        p.type === "Critical illness") &&
      !p.beneficiaries.trim(),
  );
  return (
    <BillsShell>
      <BillsHeader
        title="Cover Review"
        subtitle="Prompts that help you notice missing information and possible overlap."
        backHref="/office/insurance"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="file"
          title="Documents to check"
          detail={`${inbox.length} uploaded polic${inbox.length === 1 ? "y" : "ies"} awaiting confirmation`}
        />
        <div className="mt-4 space-y-3">
          {inbox.length ? (
            inbox.map((p) => <PolicyRow key={p.id} policy={p} />)
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#667068]">
              All uploaded policies have been reviewed.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Possible gaps and overlaps"
          detail="These are organisational prompts, not a professional assessment."
        />
        <div className="mt-4 space-y-2">
          {duplicates.map((item) => (
            <p
              key={item.type}
              className="rounded-[14px] bg-[#f4ead7] px-3 py-3 text-xs text-[#735f3e]"
            >
              You have {item.count} active {item.type.toLowerCase()} policies.
              Check whether their cover overlaps.
            </p>
          ))}
          {beneficiary.map((p) => (
            <Link
              key={p.id}
              href={`/office/insurance/${p.id}`}
              className="flex items-center justify-between rounded-[14px] bg-[#f7e4df] px-3 py-3 text-xs text-[#80493f]"
            >
              {p.title}: no beneficiary or review note recorded
              <UiIcon name="chevron-right" className="h-4 w-4" />
            </Link>
          ))}
          {!duplicates.length && !beneficiary.length ? (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#667068]">
              No prompts based on the information currently recorded.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <InsuranceNotice />
    </BillsShell>
  );
}

function Compare() {
  const { state } = useDiaryDockData();
  const comparable = state.insurance.policies.filter(
    (p) => p.reviewStatus === "reviewed" && p.history.length > 1,
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
          comparable.map((p) => {
            const previous = p.history[p.history.length - 2];
            const latest = p.history[p.history.length - 1];
            return (
              <BillsCard key={p.id}>
                <BillsSectionTitle
                  icon="chart"
                  title={p.title}
                  detail={p.provider}
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
                  href={`/office/insurance/${p.id}`}
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

function Claims() {
  const { state, updateState } = useDiaryDockData();
  const [showForm, setShowForm] = useState(false);
  const [evidenceWorking, setEvidenceWorking] = useState("");
  const policies = state.insurance.policies.filter(
    (p) => p.reviewStatus === "reviewed",
  );
  const [draft, setDraft] = useState({
    policyId: policies[0]?.id || "",
    title: "",
    claimNumberMasked: "",
    incidentDate: "",
    description: "",
    status: "draft" as ClaimStatus,
  });
  const save = () => {
    if (!draft.title.trim() || !draft.policyId) return;
    const now = new Date().toISOString();
    const claim: InsuranceClaim = {
      id: crypto.randomUUID(),
      ...draft,
      evidenceDocumentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    updateState((c) => ({
      ...c,
      insurance: { ...c.insurance, claims: [claim, ...c.insurance.claims] },
    }));
    setShowForm(false);
  };
  const addEvidence = async (
    claim: InsuranceClaim,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setEvidenceWorking(claim.id);
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${claim.title} evidence — ${file.name}`,
        category: "Insurance Claim",
        kind: documentKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "safe-room",
        roomName: "Safe Room",
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      };
      updateState((c) => ({
        ...c,
        vaultDocuments: [document, ...c.vaultDocuments],
        insurance: {
          ...c.insurance,
          claims: c.insurance.claims.map((item) =>
            item.id === claim.id
              ? {
                  ...item,
                  evidenceDocumentIds: [id, ...item.evidenceDocumentIds],
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        },
      }));
      await upsertStructuredDocument(document);
    } finally {
      setEvidenceWorking("");
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Claims Centre"
        subtitle="Record claim details, progress and references alongside the relevant policy."
        backHref="/office/insurance"
      />
      <BillsCard>
        <div className="flex items-center justify-between">
          <BillsSectionTitle
            icon="briefcase"
            title="Your claims"
            detail={`${state.insurance.claims.length} claim${state.insurance.claims.length === 1 ? "" : "s"} recorded`}
          />
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2f5140] text-white"
            aria-label="Add a claim"
          >
            <UiIcon name="plus" className="h-5 w-5" />
          </button>
        </div>
        {showForm ? (
          <div className="mt-5 rounded-[18px] bg-[#f6f5ef] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#667068]">
                Policy
                <select
                  value={draft.policyId}
                  onChange={(e) =>
                    setDraft({ ...draft, policyId: e.target.value })
                  }
                  className={fieldClass}
                >
                  <option value="">Choose policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Claim title
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Claim number (masked)
                <input
                  value={draft.claimNumberMasked}
                  onChange={(e) =>
                    setDraft({ ...draft, claimNumberMasked: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Incident date
                <input
                  type="date"
                  value={draft.incidentDate}
                  onChange={(e) =>
                    setDraft({ ...draft, incidentDate: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={save}
              className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
            >
              Save claim record
            </button>
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          {state.insurance.claims.length ? (
            state.insurance.claims.map((claim) => {
              const policy = policies.find((p) => p.id === claim.policyId);
              return (
                <article
                  key={claim.id}
                  className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#20352a]">
                        {claim.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#667068]">
                        {policy?.title || "Policy"} ·{" "}
                        {formatBillDate(claim.incidentDate)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-semibold capitalize ${claimTone[claim.status]}`}
                    >
                      {claim.status.replace("-", " ")}
                    </span>
                  </div>
                  {claim.description ? (
                    <p className="mt-3 text-xs leading-5 text-[#667068]">
                      {claim.description}
                    </p>
                  ) : null}
                  <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[13px] border border-[#6f8e72]/30 px-3 text-xs font-semibold text-[#45604d]">
                    <UiIcon name="plus" className="h-4 w-4" />
                    {evidenceWorking === claim.id
                      ? "Storing evidence…"
                      : `Add evidence${claim.evidenceDocumentIds.length ? ` · ${claim.evidenceDocumentIds.length}` : ""}`}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                      onChange={(event) => void addEvidence(claim, event)}
                      disabled={Boolean(evidenceWorking)}
                      className="sr-only"
                    />
                  </label>
                </article>
              );
            })
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">
              No claims recorded.
            </p>
          )}
        </div>
      </BillsCard>
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
        DiaryDock records your own claim notes and stores uploaded evidence
        privately in the Safe Room. It does not submit claims or communicate
        with insurers on your behalf.
      </p>
    </BillsShell>
  );
}

export function InsuranceWorkspace({
  view,
  policyId,
}: {
  view: InsuranceView;
  policyId?: string;
}) {
  if (view === "policies") return <Policies />;
  if (view === "new") return <NewPolicy />;
  if (view === "detail" && policyId)
    return <PolicyDetail policyId={policyId} />;
  if (view === "claims") return <Claims />;
  if (view === "compare") return <Compare />;
  if (view === "review") return <Review />;
  return <Dashboard />;
}
