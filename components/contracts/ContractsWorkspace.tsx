"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { BillDocumentAnalysis } from "@/lib/bill-document-analysis";
import {
  contractAnnualCost,
  contractCategories,
  contractMonthlyCost,
  type ContractRecord,
  type ContractStatus,
} from "@/lib/contract-records";
import {
  openPrivateDocument,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import {
  upsertStructuredDocument,
  upsertStructuredReminder,
} from "@/lib/structured-data";

type ContractsView =
  | "dashboard"
  | "all"
  | "checks"
  | "new"
  | "detail"
  | "cancel"
  | "forecast";
type ContractIssue = {
  id: string;
  contractId: string;
  title: string;
  detail: string;
  tone: "amber" | "red" | "green" | "blue";
  icon: IconName;
};

const statusTone: Record<ContractStatus, string> = {
  draft: "bg-[#f1eee5] text-[#806b45]",
  active: "bg-[#e6efe1] text-[#45604d]",
  cancelled: "bg-[#ececec] text-[#6d716e]",
  expired: "bg-[#f7e4df] text-[#924a40]",
};

function dateTime(value: string) {
  return value
    ? new Date(`${value}T12:00:00`).getTime()
    : Number.POSITIVE_INFINITY;
}
function daysUntil(value: string) {
  return value
    ? Math.ceil((dateTime(value) - Date.now()) / 86400000)
    : Number.POSITIVE_INFINITY;
}
function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value || 0);
}
function fileSize(bytes: number) {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function fileKind(file: File): VaultDocument["kind"] {
  return file.type === "application/pdf" ? "PDF" : "Image";
}
function cancellationDeadline(contract: ContractRecord) {
  if (!contract.renewalDate || contract.noticePeriodDays === null) return "";
  return new Date(
    dateTime(contract.renewalDate) - contract.noticePeriodDays * 86400000,
  )
    .toISOString()
    .slice(0, 10);
}
function currentPriceIncrease(contract: ContractRecord) {
  const history = [...contract.priceHistory].sort(
    (a, b) => dateTime(a.effectiveDate) - dateTime(b.effectiveDate),
  );
  if (history.length < 2) return null;
  const previous = history[history.length - 2].amount;
  const current = history[history.length - 1].amount;
  return current > previous
    ? { previous, current, change: current - previous }
    : null;
}
function deriveIssues(contracts: ContractRecord[]) {
  const issues: ContractIssue[] = [];
  const active = contracts.filter(
    (contract) =>
      contract.reviewStatus === "reviewed" && contract.status === "active",
  );
  active.forEach((contract) => {
    const promoDays = daysUntil(contract.promotionalEndDate);
    const renewalDays = daysUntil(contract.renewalDate);
    const deadlineDays = daysUntil(cancellationDeadline(contract));
    const increase = currentPriceIncrease(contract);
    if (promoDays >= 0 && promoDays <= 60)
      issues.push({
        id: `${contract.id}-promo`,
        contractId: contract.id,
        title: "Promotional price ending",
        detail: `${contract.serviceName || contract.provider}: ${formatDate(contract.promotionalEndDate)}`,
        tone: "amber",
        icon: "bell",
      });
    if (contract.minimumTermEnd && daysUntil(contract.minimumTermEnd) < 0)
      issues.push({
        id: `${contract.id}-term`,
        contractId: contract.id,
        title: "Out of minimum term",
        detail: `${contract.serviceName || contract.provider} can be reviewed now`,
        tone: "green",
        icon: "clock",
      });
    if (increase)
      issues.push({
        id: `${contract.id}-price`,
        contractId: contract.id,
        title: "Price increase detected",
        detail: `${formatMoney(increase.previous)} to ${formatMoney(increase.current)}`,
        tone: "red",
        icon: "chart",
      });
    if (contract.autoRenew && renewalDays >= 0 && renewalDays <= 60)
      issues.push({
        id: `${contract.id}-renew`,
        contractId: contract.id,
        title: "Auto-renewal approaching",
        detail: `${contract.serviceName || contract.provider}: ${formatDate(contract.renewalDate)}`,
        tone: "amber",
        icon: "clock",
      });
    if (deadlineDays >= 0 && deadlineDays <= 30)
      issues.push({
        id: `${contract.id}-deadline`,
        contractId: contract.id,
        title: "Cancellation deadline approaching",
        detail: `Recorded deadline: ${formatDate(cancellationDeadline(contract))}`,
        tone: "red",
        icon: "alert",
      });
    if (!contract.storagePath)
      issues.push({
        id: `${contract.id}-document`,
        contractId: contract.id,
        title: "Contract document missing",
        detail: `${contract.serviceName || contract.provider} has no original file attached`,
        tone: "blue",
        icon: "file",
      });
    if (!contract.lastReviewedAt || daysUntil(contract.lastReviewedAt) < -365)
      issues.push({
        id: `${contract.id}-review`,
        contractId: contract.id,
        title: "Not reviewed recently",
        detail: `${contract.serviceName || contract.provider} needs a details check`,
        tone: "blue",
        icon: "check",
      });
  });
  const grouped = new Map<string, ContractRecord[]>();
  active.forEach((contract) => {
    const key = `${contract.category}:${contract.provider}`.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), contract]);
  });
  grouped.forEach((matches) => {
    if (matches.length > 1)
      matches.forEach((contract) =>
        issues.push({
          id: `${contract.id}-duplicate`,
          contractId: contract.id,
          title: "Possible duplicate subscription",
          detail: `${matches.length} active ${contract.provider} records`,
          tone: "blue",
          icon: "alert",
        }),
      );
  });
  return issues;
}

function ContractNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise contract information and reminders. It does
      not cancel services or provide financial advice. Always check dates,
      prices and notice terms against the original contract and confirm
      cancellation directly with the provider.
    </p>
  );
}

function ContractRow({ contract }: { contract: ContractRecord }) {
  return (
    <Link
      href={`/office/contracts/${contract.id}`}
      className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon
          name={
            contract.category === "Broadband" || contract.category === "Mobile"
              ? "phone"
              : contract.category === "Membership"
                ? "users"
                : "file"
          }
          className="h-5 w-5"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {contract.serviceName ||
            contract.provider ||
            "Contract awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {contract.provider || "Provider not confirmed"} ·{" "}
          {contract.renewalDate
            ? `Renews ${formatDate(contract.renewalDate)}`
            : "No renewal date"}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-[#20352a]">
          {formatMoney(contractMonthlyCost(contract))}
          <span className="text-[9px] font-normal text-[#667068]">/mo</span>
        </span>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${statusTone[contract.status]}`}
        >
          {contract.reviewStatus === "needs-review"
            ? "Check details"
            : contract.status}
        </span>
      </span>
    </Link>
  );
}

function Dashboard() {
  const { state, hydrated } = useLifeDockData();
  const reviewed = state.contracts.contracts.filter(
    (contract) => contract.reviewStatus === "reviewed",
  );
  const active = reviewed.filter((contract) => contract.status === "active");
  const issues = deriveIssues(state.contracts.contracts);
  const endingSoon = active.filter(
    (contract) =>
      daysUntil(contract.minimumTermEnd) >= 0 &&
      daysUntil(contract.minimumTermEnd) <= 60,
  );
  const renewals = active.filter(
    (contract) =>
      daysUntil(contract.renewalDate) >= 0 &&
      daysUntil(contract.renewalDate) <= 60,
  );
  const cancellationWindows = active.filter((contract) => {
    const days = daysUntil(cancellationDeadline(contract));
    return days >= 0 && days <= 30;
  });
  const recent = [...active]
    .sort((a, b) => dateTime(a.renewalDate) - dateTime(b.renewalDate))
    .slice(0, 4);
  if (!hydrated)
    return (
      <BillsShell>
        <BillsCard>
          <p className="text-sm text-[#667068]">Opening your contracts…</p>
        </BillsCard>
      </BillsShell>
    );
  return (
    <BillsShell>
      <BillsHeader
        title="Contracts & Subscriptions"
        subtitle="See what you pay for, when contracts end and what renews automatically."
      />
      <BillsCard className="bg-[#355540] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
              Overview
            </p>
            <h2 className="mt-1 text-xl font-semibold">Your commitments</h2>
          </div>
          <UiIcon name="briefcase" className="h-5 w-5 text-white/75" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{active.length}</p>
            <p className="text-[11px] text-white/70">Active contracts</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-2xl font-semibold">{endingSoon.length}</p>
            <p className="text-[11px] text-white/70">Ending soon</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-xl font-semibold">
              {formatMoney(
                active.reduce(
                  (sum, contract) => sum + contractMonthlyCost(contract),
                  0,
                ),
              )}
            </p>
            <p className="text-[11px] text-white/70">Monthly equivalent</p>
          </div>
          <div className="rounded-[16px] bg-white/10 p-3">
            <p className="text-xl font-semibold">
              {formatMoney(
                active.reduce(
                  (sum, contract) => sum + contractAnnualCost(contract),
                  0,
                ),
              )}
            </p>
            <p className="text-[11px] text-white/70">Annual commitment</p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Things to check"
          detail={
            issues.length
              ? `${issues.length} item${issues.length === 1 ? "" : "s"} need your attention`
              : "Nothing needs attention based on confirmed details"
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-[14px] bg-[#f7f6f0] p-3">
            <p className="text-lg font-semibold text-[#20352a]">
              {renewals.length}
            </p>
            <p className="text-[10px] text-[#667068]">Renewals soon</p>
          </div>
          <div className="rounded-[14px] bg-[#f7f6f0] p-3">
            <p className="text-lg font-semibold text-[#20352a]">
              {cancellationWindows.length}
            </p>
            <p className="text-[10px] text-[#667068]">Cancellation windows</p>
          </div>
          <div className="col-span-2 rounded-[14px] bg-[#f7f6f0] p-3 sm:col-span-1">
            <p className="text-lg font-semibold text-[#20352a]">
              {
                state.contracts.contracts.filter(
                  (contract) => contract.reviewStatus === "needs-review",
                ).length
              }
            </p>
            <p className="text-[10px] text-[#667068]">Waiting for review</p>
          </div>
        </div>
        <Link
          href="/office/contracts/checks"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Review all things to check
          <UiIcon name="chevron-right" className="h-4 w-4" />
        </Link>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between">
          <BillsSectionTitle
            icon="file"
            title="Active contracts"
            detail={
              recent.length
                ? "Next renewals at a glance"
                : "No confirmed contracts yet"
            }
          />
          <Link
            href="/office/contracts/all"
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
          >
            See all
          </Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {recent.length ? (
            recent.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
              Add a contract manually or upload its document. Nothing is
              included in totals until you confirm it.
            </p>
          )}
        </div>
        <Link
          href="/office/contracts/new"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add or upload a contract
        </Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/contracts/all"
          icon="folder"
          title="All contracts"
          detail="Search and filter every commitment"
          badge={`${reviewed.length}`}
        />
        <BillsAction
          href="/office/contracts/checks"
          icon="alert"
          title="Things to check"
          detail="Renewals, price changes and possible duplicates"
          badge={`${issues.length}`}
        />
        <BillsAction
          href="/office/contracts/forecast"
          icon="chart"
          title="Commitment forecast"
          detail="See your next 12 months"
        />
        <BillsAction
          href="/office/contracts/new"
          icon="camera"
          title="Document inbox"
          detail="Upload and check a contract"
        />
      </div>
      <ContractNotice />
    </BillsShell>
  );
}

function AllContracts() {
  const { state } = useLifeDockData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const contracts = state.contracts.contracts
    .filter(
      (contract) =>
        status === "All" || contract.status === status.toLowerCase(),
    )
    .filter((contract) => category === "All" || contract.category === category)
    .filter((contract) =>
      `${contract.serviceName} ${contract.provider} ${contract.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => dateTime(a.renewalDate) - dateTime(b.renewalDate));
  return (
    <BillsShell>
      <BillsHeader
        title="My Contracts"
        subtitle="Search and filter household and personal contracts in one place."
        backHref="/office/contracts"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search contracts
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Service, provider or category"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {["All", "Active", "Draft", "Cancelled", "Expired"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold ${status === item ? "bg-[#355540] text-white" : "bg-[#f0f2e9] text-[#52705a]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-semibold text-[#667068]">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={fieldClass}
          >
            <option>All</option>
            {contractCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </BillsCard>
      <div className="space-y-3">
        {contracts.length ? (
          contracts.map((contract) => (
            <ContractRow key={contract.id} contract={contract} />
          ))
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No contracts match this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/contracts/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add or upload a contract
      </Link>
      <ContractNotice />
    </BillsShell>
  );
}

function Checks() {
  const { state } = useLifeDockData();
  const issues = deriveIssues(state.contracts.contracts);
  const inbox = state.contracts.contracts.filter(
    (contract) => contract.reviewStatus === "needs-review",
  );
  const tone = {
    amber: "bg-[#fbf0da] text-[#93641e]",
    red: "bg-[#f9e7e2] text-[#9a4f43]",
    green: "bg-[#e7efe3] text-[#49644d]",
    blue: "bg-[#e9edf5] text-[#536a8c]",
  } as const;
  return (
    <BillsShell>
      <BillsHeader
        title="Things to Check"
        subtitle="DiaryDock highlights dates and details worth reviewing. It never acts on a contract for you."
        backHref="/office/contracts"
      />
      {inbox.length ? (
        <BillsCard>
          <BillsSectionTitle
            icon="mail"
            title="Waiting for confirmation"
            detail={`${inbox.length} uploaded or draft contract${inbox.length === 1 ? "" : "s"}`}
          />
          <div className="mt-4 space-y-2.5">
            {inbox.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))}
          </div>
        </BillsCard>
      ) : null}
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Calculated checks"
          detail={
            issues.length
              ? `${issues.length} check${issues.length === 1 ? "" : "s"} from your confirmed records`
              : "No checks are currently due"
          }
        />
        <div className="mt-4 space-y-3">
          {issues.length ? (
            issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/office/contracts/${issue.contractId}`}
                className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
              >
                <span
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${tone[issue.tone]}`}
                >
                  <UiIcon name={issue.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#20352a]">
                    {issue.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-[#667068]">
                    {issue.detail}
                  </span>
                </span>
                <UiIcon
                  name="chevron-right"
                  className="h-4 w-4 text-[#6f8e72]"
                />
              </Link>
            ))
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-7 text-center text-sm text-[#667068]">
              Add and confirm contract dates to receive useful checks here.
            </p>
          )}
        </div>
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}

function NewContract() {
  const router = useRouter();
  const { updateState } = useLifeDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const makeDraft = (partial: Partial<ContractRecord> = {}) => {
    const now = new Date().toISOString();
    const draft: ContractRecord = {
      id: crypto.randomUUID(),
      serviceName: "",
      provider: "",
      category: "Other",
      status: "draft",
      reviewStatus: "needs-review",
      accountEmail: "",
      accountNumberMasked: "",
      monthlyCost: 0,
      frequency: "monthly",
      paymentMethod: "",
      startDate: "",
      minimumTermEnd: "",
      renewalDate: "",
      noticePeriodDays: null,
      autoRenew: false,
      promotionalPrice: null,
      promotionalEndDate: "",
      cancellationInstructions: "",
      notes: "",
      priceHistory: [],
      lastReviewedAt: "",
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    updateState((current) => ({
      ...current,
      contracts: { contracts: [draft, ...current.contracts.contracts] },
    }));
    return draft;
  };
  const manual = () => {
    const draft = makeDraft();
    router.push(`/office/contracts/${draft.id}`);
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const form = new FormData();
      form.append("analysisMode", "bill");
      form.append("files", file);
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        billAnalysis?: BillDocumentAnalysis;
        error?: string;
      };
      const analysis = payload.billAnalysis;
      const now = new Date().toISOString();
      const contract: ContractRecord = {
        id,
        documentId: id,
        serviceName: analysis?.title ?? "",
        provider: analysis?.provider ?? "",
        category:
          analysis?.category === "Communications"
            ? "Broadband"
            : analysis?.category === "Subscriptions"
              ? "Streaming"
              : analysis?.category === "Home services"
                ? "Home service"
                : "Other",
        status: "draft",
        reviewStatus: "needs-review",
        accountEmail: "",
        accountNumberMasked: analysis?.accountNumberMasked ?? "",
        monthlyCost: analysis?.amount ?? 0,
        frequency: analysis?.frequency ?? "monthly",
        paymentMethod: analysis?.paymentMethod ?? "",
        startDate: analysis?.billingPeriodStart ?? "",
        minimumTermEnd: analysis?.contractEndDate ?? "",
        renewalDate: analysis?.contractEndDate ?? "",
        noticePeriodDays: analysis?.noticePeriodDays ?? null,
        autoRenew: false,
        promotionalPrice: null,
        promotionalEndDate: "",
        cancellationInstructions: "",
        notes: analysis?.reviewReasons.join(" · ") ?? "",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        priceHistory: analysis?.amount
          ? [
              {
                id: crypto.randomUUID(),
                amount: analysis.amount,
                effectiveDate: analysis.billingPeriodStart || now.slice(0, 10),
                recordedAt: now,
              },
            ]
          : [],
        lastReviewedAt: "",
        createdAt: now,
        updatedAt: now,
      };
      const document: VaultDocument = {
        id,
        title: analysis?.title || file.name,
        category: "Finance",
        kind: fileKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        issuer: analysis?.provider,
        dueDate: analysis?.contractEndDate,
        extractionSummary: analysis?.summary,
        extractedText: analysis?.extractedText,
        reviewStatus: "needs-review",
        reviewReasons: analysis?.reviewReasons ?? [
          payload.error ||
            "The contract could not be read automatically. Enter and check the details manually.",
        ],
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [
          document,
          ...current.vaultDocuments.filter((item) => item.id !== id),
        ],
        contracts: {
          contracts: [
            contract,
            ...current.contracts.contracts.filter((item) => item.id !== id),
          ],
        },
      }));
      await upsertStructuredDocument(document);
      router.push(`/office/contracts/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to add this contract.",
      );
      setWorking(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Add a Contract"
        subtitle="Upload a contract for a helpful first read, or enter the details yourself."
        backHref="/office/contracts"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Upload a contract document"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 10 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]">
          <UiIcon name="plus" className="h-7 w-7 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working ? "Reading your contract…" : "Choose a contract file"}
          </span>
          <span className="mt-1 text-xs text-[#667068]">
            You will check all extracted details before they are used.
          </span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            disabled={working}
            onChange={(event) => void upload(event)}
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#924a40]"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={manual}
          className="mt-4 min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Enter details manually
        </button>
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}

function ContractDetail({ contractId }: { contractId: string }) {
  const { state, updateState } = useLifeDockData();
  const original = state.contracts.contracts.find(
    (contract) => contract.id === contractId,
  );
  const [draft, setDraft] = useState(original);
  const [tab, setTab] = useState<
    "overview" | "dates" | "payments" | "documents"
  >("overview");
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState(false);
  if (!draft)
    return (
      <BillsShell>
        <BillsHeader
          title="Contract Not Found"
          subtitle="This contract is not available in your private records."
          backHref="/office/contracts"
        />
      </BillsShell>
    );
  const update = <K extends keyof ContractRecord>(
    key: K,
    value: ContractRecord[K],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const save = () => {
    const now = new Date().toISOString();
    const previous = original?.priceHistory.at(-1);
    const history =
      draft.monthlyCost > 0 &&
      (!previous || previous.amount !== draft.monthlyCost)
        ? [
            ...draft.priceHistory,
            {
              id: crypto.randomUUID(),
              amount: draft.monthlyCost,
              effectiveDate: now.slice(0, 10),
              recordedAt: now,
            },
          ]
        : draft.priceHistory;
    const saved = {
      ...draft,
      status: draft.status === "draft" ? ("active" as const) : draft.status,
      reviewStatus: "reviewed" as const,
      lastReviewedAt: now.slice(0, 10),
      updatedAt: now,
      priceHistory: history,
    };
    setDraft(saved);
    updateState((current) => ({
      ...current,
      contracts: {
        contracts: current.contracts.contracts.map((contract) =>
          contract.id === saved.id ? saved : contract,
        ),
      },
    }));
    setMessage("Contract details saved.");
  };
  const addReminder = async () => {
    const dueDate =
      cancellationDeadline(draft) || draft.renewalDate || draft.minimumTermEnd;
    if (!dueDate) {
      setMessage("Add a renewal or contract end date first.");
      return;
    }
    const reminder: Reminder = {
      id: `contract-${draft.id}-${dueDate}`,
      title: `Review ${draft.serviceName || draft.provider || "contract"}`,
      note: "Check the provider terms, price and notice period before taking action.",
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatDate(dueDate),
      priority: "normal",
      documentId: draft.documentId,
      documentTitle: draft.serviceName,
      dueDate,
    };
    updateState((current) => ({
      ...current,
      reminders: [
        reminder,
        ...current.reminders.filter((item) => item.id !== reminder.id),
      ],
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Review reminder added.");
  };
  const openDocument = async () => {
    setOpening(true);
    setMessage("");
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to open the contract document.",
      );
    } finally {
      setOpening(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title={
          draft.reviewStatus === "needs-review"
            ? "Check Contract Details"
            : draft.serviceName || "Contract Details"
        }
        subtitle={
          draft.reviewStatus === "needs-review"
            ? "Compare these details with the original contract, correct anything needed, then confirm."
            : `${draft.provider || "Provider not recorded"} · ${formatMoney(contractMonthlyCost(draft))} monthly equivalent`
        }
        backHref="/office/contracts"
      />
      {draft.reviewStatus === "needs-review" ? (
        <p className="rounded-[18px] border border-[#d8c9ad] bg-[#f4ead7] px-4 py-3 text-[12px] leading-5 text-[#6f604a]">
          <strong>Check before saving.</strong> DiaryDock's document read is a
          helpful starting point and may contain mistakes.
        </p>
      ) : null}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["overview", "dates", "payments", "documents"] as const).map(
          (item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold capitalize ${tab === item ? "bg-[#355540] text-white" : "bg-white text-[#52705a]"}`}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <BillsCard>
        <BillsSectionTitle
          icon={
            tab === "dates"
              ? "calendar"
              : tab === "payments"
                ? "chart"
                : tab === "documents"
                  ? "folder"
                  : "file"
          }
          title={
            tab === "overview"
              ? "Contract information"
              : tab === "dates"
                ? "Dates and renewal"
                : tab === "payments"
                  ? "Payments and price history"
                  : "Contract documents"
          }
        />
        {tab === "overview" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#667068]">
              Service name
              <input
                value={draft.serviceName}
                onChange={(event) => update("serviceName", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Provider
              <input
                value={draft.provider}
                onChange={(event) => update("provider", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Category
              <select
                value={draft.category}
                onChange={(event) =>
                  update(
                    "category",
                    event.target.value as ContractRecord["category"],
                  )
                }
                className={fieldClass}
              >
                {contractCategories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Status
              <select
                value={draft.status}
                onChange={(event) =>
                  update("status", event.target.value as ContractStatus)
                }
                className={fieldClass}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Account email
              <input
                type="email"
                value={draft.accountEmail}
                onChange={(event) => update("accountEmail", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Account number (masked)
              <input
                value={draft.accountNumberMasked}
                onChange={(event) =>
                  update("accountNumberMasked", event.target.value)
                }
                className={fieldClass}
                placeholder="•••• 1234"
              />
            </label>
          </div>
        ) : null}
        {tab === "dates" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#667068]">
              Start date
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => update("startDate", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Minimum term ends
              <input
                type="date"
                value={draft.minimumTermEnd}
                onChange={(event) =>
                  update("minimumTermEnd", event.target.value)
                }
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Renewal date
              <input
                type="date"
                value={draft.renewalDate}
                onChange={(event) => update("renewalDate", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Notice period (days)
              <input
                type="number"
                min="0"
                value={draft.noticePeriodDays ?? ""}
                onChange={(event) =>
                  update(
                    "noticePeriodDays",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Promotional price (£)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.promotionalPrice ?? ""}
                onChange={(event) =>
                  update(
                    "promotionalPrice",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-[#667068]">
              Promotion ends
              <input
                type="date"
                value={draft.promotionalEndDate}
                onChange={(event) =>
                  update("promotionalEndDate", event.target.value)
                }
                className={fieldClass}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a] sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.autoRenew}
                onChange={(event) => update("autoRenew", event.target.checked)}
                className="h-4 w-4 accent-[#45604d]"
              />
              Renews automatically
            </label>
            {cancellationDeadline(draft) ? (
              <p className="rounded-[14px] bg-[#f0f2e9] px-3 py-2.5 text-xs leading-5 text-[#52705a] sm:col-span-2">
                Your calculated notice deadline is{" "}
                <strong>{formatDate(cancellationDeadline(draft))}</strong>.
                Confirm this against the provider's terms.
              </p>
            ) : null}
          </div>
        ) : null}
        {tab === "payments" ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#667068]">
                Price (£)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.monthlyCost || ""}
                  onChange={(event) =>
                    update("monthlyCost", Number(event.target.value))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Charged
                <select
                  value={draft.frequency}
                  onChange={(event) =>
                    update(
                      "frequency",
                      event.target.value as ContractRecord["frequency"],
                    )
                  }
                  className={fieldClass}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="one-off">One-off</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
                Payment method
                <input
                  value={draft.paymentMethod}
                  onChange={(event) =>
                    update("paymentMethod", event.target.value)
                  }
                  className={fieldClass}
                  placeholder="Direct Debit, card…"
                />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#667068]">
                Confirmed price history
              </p>
              <div className="mt-2 space-y-2">
                {draft.priceHistory.length ? (
                  [...draft.priceHistory].reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-2.5 text-xs"
                    >
                      <span className="text-[#667068]">
                        {formatDate(entry.effectiveDate)}
                      </span>
                      <span className="font-semibold text-[#20352a]">
                        {formatMoney(entry.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#667068]">
                    The first confirmed price will start the history.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "documents" ? (
          <div className="mt-5 space-y-3">
            {draft.storagePath ? (
              <button
                type="button"
                onClick={() => void openDocument()}
                disabled={opening}
                className="flex min-h-[72px] w-full items-center gap-3 rounded-[18px] border border-[#20352a]/[0.08] bg-[#f7f7f1] p-3 text-left"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
                  <UiIcon name="file" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#20352a]">
                    {draft.originalFileName || "Original contract"}
                  </span>
                  <span className="text-[11px] text-[#667068]">
                    Private document · signed link opens for 60 seconds
                  </span>
                </span>
                <span className="text-xs font-semibold text-[#52705a]">
                  {opening ? "Opening…" : "View"}
                </span>
              </button>
            ) : (
              <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
                No original contract document is attached. Add a new record from
                the upload screen if you need a securely stored copy.
              </p>
            )}
          </div>
        ) : null}
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Notes
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(event) => update("notes", event.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={save}
            className="min-h-12 flex-1 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
          >
            {draft.reviewStatus === "needs-review"
              ? "Confirm and save"
              : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => void addReminder()}
            className="min-h-12 flex-1 rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
          >
            Add review reminder
          </button>
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
      <BillsAction
        href={`/office/contracts/${draft.id}/cancel`}
        icon="check"
        title="Cancellation guide & proof"
        detail="Work through your notice steps and keep confirmation"
      />
      <ContractNotice />
    </BillsShell>
  );
}

function CancellationGuide({ contractId }: { contractId: string }) {
  const { state, updateState } = useLifeDockData();
  const contract = state.contracts.contracts.find(
    (item) => item.id === contractId,
  );
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  if (!contract)
    return (
      <BillsShell>
        <BillsHeader
          title="Contract Not Found"
          subtitle="This contract is not available."
          backHref="/office/contracts"
        />
      </BillsShell>
    );
  const updateInstructions = (value: string) =>
    updateState((current) => ({
      ...current,
      contracts: {
        contracts: current.contracts.contracts.map((item) =>
          item.id === contract.id
            ? {
                ...item,
                cancellationInstructions: value,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      },
    }));
  const uploadProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setMessage("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${contract.serviceName || contract.provider} cancellation confirmation`,
        category: "Finance",
        kind: fileKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        issuer: contract.provider,
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
        reviewReasons: [],
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [document, ...current.vaultDocuments],
        contracts: {
          contracts: current.contracts.contracts.map((item) =>
            item.id === contract.id
              ? {
                  ...item,
                  cancellationProofDocumentId: id,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        },
      }));
      await upsertStructuredDocument(document);
      setMessage("Cancellation confirmation stored securely.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to store this confirmation.",
      );
    } finally {
      setWorking(false);
    }
  };
  const deadline = cancellationDeadline(contract);
  return (
    <BillsShell>
      <BillsHeader
        title="Cancellation Guide"
        subtitle={`A practical record for ${contract.serviceName || contract.provider}. DiaryDock will not contact the provider for you.`}
        backHref={`/office/contracts/${contract.id}`}
      />
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Dates to confirm"
          detail="Check every date against the original contract or provider account"
        />
        <dl className="mt-4 divide-y divide-[#20352a]/[0.07] rounded-[18px] bg-[#f7f7f1] px-4">
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Minimum term ends</dt>
            <dd className="font-semibold text-[#20352a]">
              {formatDate(contract.minimumTermEnd)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Renewal date</dt>
            <dd className="font-semibold text-[#20352a]">
              {formatDate(contract.renewalDate)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Notice period</dt>
            <dd className="font-semibold text-[#20352a]">
              {contract.noticePeriodDays === null
                ? "Not recorded"
                : `${contract.noticePeriodDays} days`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Calculated deadline</dt>
            <dd className="font-semibold text-[#20352a]">
              {formatDate(deadline)}
            </dd>
          </div>
        </dl>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="Cancellation instructions"
          detail="Record the provider's own steps and contact details"
        />
        <textarea
          rows={6}
          value={contract.cancellationInstructions}
          onChange={(event) => updateInstructions(event.target.value)}
          className={`${fieldClass} mt-4`}
          placeholder="For example: call the provider, quote the account reference, request written confirmation…"
        />
        <ol className="mt-4 space-y-2 text-xs leading-5 text-[#667068]">
          <li>
            1. Confirm the minimum term, notice deadline and any exit fee.
          </li>
          <li>
            2. Contact the provider using details from your official contract.
          </li>
          <li>3. Ask for written confirmation and the final payment date.</li>
          <li>4. Store that confirmation below.</li>
        </ol>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="lock"
          title="Proof of cancellation"
          detail="Store the email, letter or screenshot in private document storage"
        />
        <label className="mt-4 flex min-h-24 cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-4 text-center text-sm font-semibold text-[#45604d]">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            disabled={working}
            onChange={(event) => void uploadProof(event)}
          />
          {working
            ? "Storing securely…"
            : contract.cancellationProofDocumentId
              ? "Replace cancellation confirmation"
              : "Upload cancellation confirmation"}
        </label>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}

function Forecast() {
  const { state } = useLifeDockData();
  const active = state.contracts.contracts.filter(
    (contract) =>
      contract.reviewStatus === "reviewed" && contract.status === "active",
  );
  const byCategory = useMemo(
    () =>
      contractCategories
        .map((category) => ({
          category,
          total: active
            .filter((contract) => contract.category === category)
            .reduce((sum, contract) => sum + contractAnnualCost(contract), 0),
        }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total),
    [active],
  );
  const total = byCategory.reduce((sum, item) => sum + item.total, 0);
  return (
    <BillsShell>
      <BillsHeader
        title="Commitment Forecast"
        subtitle="A simple 12-month view based on the contract prices you have confirmed."
        backHref="/office/contracts"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="chart"
          title="Next 12 months"
          detail={`${active.length} active confirmed contract${active.length === 1 ? "" : "s"}`}
        />
        <p className="mt-5 text-3xl font-semibold text-[#20352a]">
          {formatMoney(total)}
        </p>
        <p className="mt-1 text-xs text-[#667068]">
          Estimated recurring commitment, not a bank balance or guaranteed
          forecast.
        </p>
        <div className="mt-6 space-y-4">
          {byCategory.map((item) => (
            <div key={item.category}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#20352a]">
                  {item.category}
                </span>
                <span className="text-[#667068]">
                  {formatMoney(item.total)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef2e9]">
                <div
                  className="h-full rounded-full bg-[#6f8e72]"
                  style={{
                    width: `${total ? Math.max(4, (item.total / total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {!byCategory.length ? (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-7 text-center text-sm text-[#667068]">
              Confirm an active recurring contract to see its forecast here.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}

export function ContractsWorkspace({
  view,
  contractId,
}: {
  view: ContractsView;
  contractId?: string;
}) {
  if (view === "all") return <AllContracts />;
  if (view === "checks") return <Checks />;
  if (view === "new") return <NewContract />;
  if (view === "detail" && contractId)
    return <ContractDetail contractId={contractId} />;
  if (view === "cancel" && contractId)
    return <CancellationGuide contractId={contractId} />;
  if (view === "forecast") return <Forecast />;
  return <Dashboard />;
}
