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
import { uploadPrivateDocument } from "@/lib/document-storage";
import {
  homeInventoryRooms,
  type ClaimStatus,
  type HomeInventoryItem,
  type HomeInventoryRoom,
  type InsuranceClaim,
} from "@/lib/insurance-records";
import type { VaultDocument } from "@/lib/mock-data";
import {
  documentKind,
  formatFileSize as fileSize,
} from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";

type HomeInsuranceView =
  | "dashboard"
  | "cover"
  | "inventory"
  | "high-value"
  | "check"
  | "claim";

function HomeInsuranceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock organises information you record about your home insurance. It
      does not assess whether your cover is adequate, make a valuation, submit a
      claim or provide financial or insurance advice.
    </p>
  );
}
function parseCoverValue(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function useHomePolicy() {
  const { state } = useDiaryDockData();
  return (
    state.insurance.policies.find(
      (policy) =>
        policy.type === "Home" &&
        policy.reviewStatus === "reviewed" &&
        policy.status === "active",
    ) ??
    state.insurance.policies.find(
      (policy) => policy.type === "Home" && policy.reviewStatus === "reviewed",
    )
  );
}

function NoHomePolicy() {
  return (
    <>
      <BillsCard>
        <div className="rounded-[20px] bg-[#f6f5ef] px-5 py-8 text-center">
          <UiIcon name="home" className="mx-auto h-9 w-9 text-[#6f8e72]" />
          <h2 className="mt-3 text-lg font-semibold text-[#20352a]">
            Add your home policy first
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-5 text-[#667068]">
            Upload or enter your home insurance policy, then confirm its details
            before using cover checks, inventory totals or claims.
          </p>
          <Link
            href="/office/insurance/new"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] px-5 text-sm font-semibold text-white"
          >
            Add home policy
          </Link>
        </div>
      </BillsCard>
      <HomeInsuranceNotice />
    </>
  );
}

function Dashboard() {
  const { state, hydrated } = useDiaryDockData();
  const policy = useHomePolicy();
  if (!hydrated)
    return (
      <BillsShell>
        <div className="rounded-[28px] bg-white/70 p-8 text-sm text-[#667068]">
          Opening home insurance…
        </div>
      </BillsShell>
    );
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Home Insurance"
          subtitle="Protect your home, belongings and peace of mind by keeping the information you rely on organised."
          backHref="/office/insurance"
        />
        <NoHomePolicy />
      </BillsShell>
    );
  const items = state.insurance.homeInventory.filter(
    (item) => item.policyId === policy.id,
  );
  const inventoryTotal = items.reduce(
    (sum, item) => sum + item.estimatedValue * item.quantity,
    0,
  );
  const claims = state.insurance.claims.filter(
    (claim) => claim.policyId === policy.id,
  );
  const included = policy.coverItems.filter((item) => item.included);
  return (
    <BillsShell>
      <BillsHeader
        title="Home Insurance"
        subtitle="Your policy details, documents, home inventory and claims in one secure place."
        backHref="/office/insurance"
      />
      <BillsCard>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#f1ead7] text-[#a06b24]">
            <UiIcon name="home" className="h-6 w-6" />
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
              <span className="rounded-full bg-[#e6efe1] px-2.5 py-1 text-[9px] font-semibold text-[#45604d]">
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
                Renews{" "}
                <strong className="float-right text-[#20352a]">
                  {formatBillDate(policy.renewalDate)}
                </strong>
              </p>
            </div>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="shield"
          title="Policy at a glance"
          detail="Confirmed information from your policy record"
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[15px] bg-[#f6f5ef] p-3">
            <p className="text-[10px] text-[#667068]">Premium</p>
            <p className="mt-1 text-base font-semibold text-[#20352a]">
              {formatMoney(policy.premium)}
              <span className="text-[9px] font-normal">
                /
                {policy.premiumFrequency === "monthly"
                  ? "mo"
                  : policy.premiumFrequency === "annual"
                    ? "yr"
                    : "once"}
              </span>
            </p>
          </div>
          <div className="rounded-[15px] bg-[#f6f5ef] p-3">
            <p className="text-[10px] text-[#667068]">Excess</p>
            <p className="mt-1 text-base font-semibold text-[#20352a]">
              {formatMoney(policy.excess)}
            </p>
          </div>
          {included.slice(0, 2).map((item) => (
            <div key={item.id} className="rounded-[15px] bg-[#f6f5ef] p-3">
              <p className="truncate text-[10px] text-[#667068]">
                {item.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#20352a]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <Link
          href="/office/insurance/home/cover"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
        >
          View cover details
        </Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href={`/office/insurance/${policy.id}`}
          icon="file"
          title="Policy documents"
          detail="Open details and original policy"
        />
        <BillsAction
          href="/office/insurance/compare"
          icon="chart"
          title="Renewal comparison"
          detail="Compare confirmed renewal figures"
        />
        <BillsAction
          href="/office/insurance/home/inventory"
          icon="archive"
          title="Home inventory"
          detail={`${items.length} item${items.length === 1 ? "" : "s"} · ${formatMoney(inventoryTotal)}`}
        />
        <BillsAction
          href="/office/insurance/home/claim"
          icon="briefcase"
          title="Make a claim record"
          detail="Prepare details and a claim checklist"
        />
      </div>
      <BillsCard>
        <BillsSectionTitle
          icon="clock"
          title="Recent home insurance activity"
          detail="Based on information stored in DiaryDock"
        />
        <div className="mt-4 space-y-2">
          {items.slice(0, 2).map((item) => (
            <p
              key={item.id}
              className="flex items-center justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs"
            >
              <span className="font-semibold text-[#20352a]">
                {item.name} added
              </span>
              <span className="text-[#667068]">
                {formatMoney(item.estimatedValue * item.quantity)}
              </span>
            </p>
          ))}
          {claims.slice(0, 2).map((claim) => (
            <p
              key={claim.id}
              className="flex items-center justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs"
            >
              <span className="font-semibold text-[#20352a]">
                {claim.title}
              </span>
              <span className="capitalize text-[#667068]">
                {claim.status.replace("-", " ")}
              </span>
            </p>
          ))}
          {!items.length && !claims.length ? (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">
              Activity will appear as you add inventory items and claim records.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/insurance/home/check"
          icon="check"
          title="Cover checker"
          detail="Review recorded values and policy limits"
        />
        <BillsAction
          href="/office/insurance/home/high-value"
          icon="star"
          title="High-value items"
          detail="Keep valuable belongings easy to review"
        />
        <BillsAction
          href="/office/insurance/claims"
          icon="clock"
          title="Claims history"
          detail={`${claims.length} home claim${claims.length === 1 ? "" : "s"} recorded`}
        />
        <BillsAction
          href="/family"
          icon="users"
          title="Trusted access"
          detail="Manage existing household permissions"
        />
      </div>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

function Cover() {
  const policy = useHomePolicy();
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Cover Details"
          subtitle="Review the cover information you have confirmed."
          backHref="/office/insurance/home"
        />
        <NoHomePolicy />
      </BillsShell>
    );
  const grouped = {
    included: policy.coverItems.filter((item) => item.included),
    excluded: policy.coverItems.filter((item) => !item.included),
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Cover Details"
        subtitle="A plain-language view of information recorded from your policy documents."
        backHref="/office/insurance/home"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="home"
          title="Buildings and contents"
          detail={
            policy.coverSummary ||
            "No plain-language summary has been recorded."
          }
        />
        <div className="mt-4 space-y-2">
          {grouped.included.length ? (
            grouped.included.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-[14px] bg-[#f6f5ef] px-3 py-3"
              >
                <UiIcon
                  name="check"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#52705a]"
                />
                <span className="min-w-0 flex-1 text-xs font-semibold text-[#20352a]">
                  {item.label}
                </span>
                <span className="text-right text-[11px] text-[#667068]">
                  {item.value}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">
              No included cover items recorded.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="alert"
          title="Excesses and exclusions"
          detail={`Recorded policy excess: ${formatMoney(policy.excess)}`}
        />
        <div className="mt-4 space-y-2">
          {grouped.excluded.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-[14px] bg-[#f7e4df] px-3 py-3"
            >
              <UiIcon
                name="alert"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#924a40]"
              />
              <span className="min-w-0 flex-1 text-xs font-semibold text-[#6f4039]">
                {item.label}
              </span>
              <span className="text-right text-[11px] text-[#80524b]">
                {item.value}
              </span>
            </div>
          ))}
          {!grouped.excluded.length ? (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">
              No exclusions have been recorded here. Always check the complete
              policy wording.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <Link
        href={`/office/insurance/${policy.id}`}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
      >
        Open full policy record
      </Link>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

function Inventory({ highValueOnly = false }: { highValueOnly?: boolean }) {
  const { state, updateState } = useDiaryDockData();
  const policy = useHomePolicy();
  const [showForm, setShowForm] = useState(false);
  const [room, setRoom] = useState<string>("All");
  const [category, setCategory] = useState("All");
  const [working, setWorking] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    room: "Living room" as HomeInventoryRoom,
    category: "Furniture",
    quantity: 1,
    estimatedValue: 0,
    purchaseDate: "",
    serialNumberMasked: "",
    highValue: false,
    notes: "",
  });
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title={highValueOnly ? "High-Value Items" : "Home Inventory"}
          subtitle="Record belongings against your home policy."
          backHref="/office/insurance/home"
        />
        <NoHomePolicy />
      </BillsShell>
    );
  const allItems = state.insurance.homeInventory.filter(
    (item) => item.policyId === policy.id,
  );
  const categories = Array.from(
    new Set(allItems.map((item) => item.category)),
  ).sort();
  const items = allItems
    .filter((item) => !highValueOnly || item.highValue)
    .filter((item) => room === "All" || item.room === room)
    .filter((item) => category === "All" || item.category === category);
  const total = items.reduce(
    (sum, item) => sum + item.estimatedValue * item.quantity,
    0,
  );
  const save = () => {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const item: HomeInventoryItem = {
      id: crypto.randomUUID(),
      policyId: policy.id,
      ...draft,
      photoDocumentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    updateState((c) => ({
      ...c,
      insurance: {
        ...c.insurance,
        homeInventory: [item, ...c.insurance.homeInventory],
      },
    }));
    setDraft({
      name: "",
      room: "Living room",
      category: "Furniture",
      quantity: 1,
      estimatedValue: 0,
      purchaseDate: "",
      serialNumberMasked: "",
      highValue: false,
      notes: "",
    });
    setShowForm(false);
  };
  const upload = async (
    item: HomeInventoryItem,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(item.id);
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${item.name} — ${file.name}`,
        category: "Home Inventory",
        kind: documentKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      };
      updateState((c) => ({
        ...c,
        vaultDocuments: [document, ...c.vaultDocuments],
        insurance: {
          ...c.insurance,
          homeInventory: c.insurance.homeInventory.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  photoDocumentIds: [id, ...entry.photoDocumentIds],
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          ),
        },
      }));
      await upsertStructuredDocument(document);
    } finally {
      setWorking("");
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title={highValueOnly ? "High-Value Items" : "Home Inventory"}
        subtitle={
          highValueOnly
            ? "Review valuable belongings and the evidence stored with them."
            : "Organise belongings by room with values, photos and receipts."
        }
        backHref="/office/insurance/home"
      />
      <BillsCard>
        <div className="flex items-center justify-between gap-3">
          <BillsSectionTitle
            icon={highValueOnly ? "star" : "archive"}
            title={highValueOnly ? "Valuable belongings" : "Your belongings"}
            detail={`${items.length} item${items.length === 1 ? "" : "s"} shown · ${formatMoney(total)}`}
          />
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            aria-label="Add inventory item"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f5140] text-white"
          >
            <UiIcon name="plus" className="h-5 w-5" />
          </button>
        </div>
        {showForm ? (
          <div className="mt-5 rounded-[18px] bg-[#f6f5ef] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#667068]">
                Item name
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Room
                <select
                  value={draft.room}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      room: e.target.value as HomeInventoryRoom,
                    })
                  }
                  className={fieldClass}
                >
                  {homeInventoryRooms.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Category
                <input
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Quantity
                <input
                  type="number"
                  min="1"
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      quantity: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Estimated value each (£)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.estimatedValue || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      estimatedValue: Number(e.target.value),
                    })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Purchase date
                <input
                  type="date"
                  value={draft.purchaseDate}
                  onChange={(e) =>
                    setDraft({ ...draft, purchaseDate: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Serial number (masked)
                <input
                  value={draft.serialNumberMasked}
                  onChange={(e) =>
                    setDraft({ ...draft, serialNumberMasked: e.target.value })
                  }
                  className={fieldClass}
                  placeholder="•••• 1234"
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]">
                <input
                  type="checkbox"
                  checked={draft.highValue}
                  onChange={(e) =>
                    setDraft({ ...draft, highValue: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#45604d]"
                />
                Mark as high value
              </label>
            </div>
            <button
              type="button"
              onClick={save}
              className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
            >
              Save inventory item
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Room
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              {homeInventoryRooms.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              {categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 space-y-3">
          {items.length ? (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
                    <UiIcon
                      name={item.highValue ? "star" : "home"}
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#20352a]">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#667068]">
                      {item.room} · {item.category} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#20352a]">
                    {formatMoney(item.estimatedValue * item.quantity)}
                  </span>
                </div>
                <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[13px] border border-[#6f8e72]/30 px-3 text-xs font-semibold text-[#45604d]">
                  <UiIcon name="camera" className="h-4 w-4" />
                  {working === item.id
                    ? "Storing…"
                    : `Add photo or receipt${item.photoDocumentIds.length ? ` · ${item.photoDocumentIds.length}` : ""}`}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                    onChange={(event) => void upload(item, event)}
                    disabled={Boolean(working)}
                    className="sr-only"
                  />
                </label>
              </article>
            ))
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-6 text-center text-xs text-[#667068]">
              No inventory items match this view.
            </p>
          )}
        </div>
      </BillsCard>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

function CoverCheck() {
  const { state, updateState } = useDiaryDockData();
  const policy = useHomePolicy();
  const stored = policy ? state.insurance.homeCoverChecks.find(
    (check) => check.policyId === policy.id,
  ) : undefined;
  const [draft, setDraft] = useState({
    estimatedRebuildCost: stored?.estimatedRebuildCost || 0,
    recentHomeChanges: stored?.recentHomeChanges || "",
  });
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="Cover Check"
          subtitle="Compare information you have recorded."
          backHref="/office/insurance/home"
        />
        <NoHomePolicy />
      </BillsShell>
    );
  const items = state.insurance.homeInventory.filter(
    (item) => item.policyId === policy.id,
  );
  const inventoryTotal = items.reduce(
    (sum, item) => sum + item.estimatedValue * item.quantity,
    0,
  );
  const contentsLimit = parseCoverValue(
    policy.coverItems.find((item) => /contents/i.test(item.label))?.value || "",
  );
  const buildingsLimit = parseCoverValue(
    policy.coverItems.find((item) => /building/i.test(item.label))?.value || "",
  );
  const save = () => {
    const check = {
      policyId: policy.id,
      ...draft,
      lastReviewedAt: new Date().toISOString(),
    };
    updateState((c) => ({
      ...c,
      insurance: {
        ...c.insurance,
        homeCoverChecks: [
          check,
          ...c.insurance.homeCoverChecks.filter(
            (item) => item.policyId !== policy.id,
          ),
        ],
      },
    }));
  };
  const contentsDifference = contentsLimit - inventoryTotal;
  const buildingsDifference = buildingsLimit - draft.estimatedRebuildCost;
  return (
    <BillsShell>
      <BillsHeader
        title="Cover Check"
        subtitle="Compare your recorded inventory and rebuild estimate with recorded policy limits."
        backHref="/office/insurance/home"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="archive"
          title="Contents check"
          detail="Based only on inventory values you entered"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[15px] bg-[#f6f5ef] p-3">
            <p className="text-[10px] text-[#667068]">Inventory total</p>
            <p className="mt-1 text-lg font-semibold text-[#20352a]">
              {formatMoney(inventoryTotal)}
            </p>
          </div>
          <div className="rounded-[15px] bg-[#f6f5ef] p-3">
            <p className="text-[10px] text-[#667068]">
              Recorded contents limit
            </p>
            <p className="mt-1 text-lg font-semibold text-[#20352a]">
              {contentsLimit ? formatMoney(contentsLimit) : "Not recorded"}
            </p>
          </div>
        </div>
        <p
          className={`mt-4 rounded-[14px] px-3 py-3 text-xs leading-5 ${contentsLimit && contentsDifference < 0 ? "bg-[#f7e4df] text-[#80493f]" : "bg-[#f0f2e9] text-[#52705a]"}`}
        >
          {!contentsLimit
            ? "Add a contents cover value to your policy record before comparing."
            : contentsDifference < 0
              ? `Your recorded inventory is ${formatMoney(Math.abs(contentsDifference))} above the recorded contents limit. Review the source values and speak to your provider if needed.`
              : `The recorded contents limit is ${formatMoney(contentsDifference)} above your current inventory total. This is not an adequacy assessment.`}
        </p>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="home"
          title="Buildings check"
          detail="Use a professional rebuild estimate rather than the market value of your home."
        />
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Estimated rebuild cost (£)
          <input
            type="number"
            min="0"
            value={draft.estimatedRebuildCost || ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                estimatedRebuildCost: Number(e.target.value),
              })
            }
            className={fieldClass}
          />
        </label>
        <p className="mt-3 rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs leading-5 text-[#667068]">
          Recorded buildings limit:{" "}
          <strong>
            {buildingsLimit ? formatMoney(buildingsLimit) : "Not recorded"}
          </strong>
          {buildingsLimit && draft.estimatedRebuildCost
            ? ` · Difference: ${formatMoney(buildingsDifference)}`
            : ""}
        </p>
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Recent home changes
          <textarea
            rows={4}
            value={draft.recentHomeChanges}
            onChange={(e) =>
              setDraft({ ...draft, recentHomeChanges: e.target.value })
            }
            className={fieldClass}
            placeholder="Extension, renovation, garden office, new valuables…"
          />
        </label>
        <button
          type="button"
          onClick={save}
          className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
        >
          Save cover check
        </button>
      </BillsCard>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

function Claim() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const policy = useHomePolicy();
  const claimTypes = [
    "Escape of water",
    "Storm damage",
    "Fire or smoke",
    "Theft or burglary",
    "Accidental damage",
    "Home emergency",
    "Vandalism",
    "Other",
  ];
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  if (!policy)
    return (
      <BillsShell>
        <BillsHeader
          title="New Home Claim"
          subtitle="Prepare the information for a home insurance claim."
          backHref="/office/insurance/home"
        />
        <NoHomePolicy />
      </BillsShell>
    );
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
      updatedAt: now,
    };
    updateState((c) => ({
      ...c,
      insurance: { ...c.insurance, claims: [claim, ...c.insurance.claims] },
    }));
    router.push("/office/insurance/claims");
  };
  return (
    <BillsShell>
      <BillsHeader
        title="New Home Claim"
        subtitle="Create an organisational claim pack, then add evidence in the Claims Centre."
        backHref="/office/insurance/home"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="briefcase"
          title="What happened?"
          detail="Choose the closest description. Your insurer decides how a claim is categorised."
        />
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {claimTypes.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setType(item)}
              className={`min-h-[76px] rounded-[16px] border p-3 text-xs font-semibold ${type === item ? "border-[#52705a] bg-[#e6efe1] text-[#20352a]" : "border-[#20352a]/[0.07] bg-white text-[#667068]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-xs font-semibold text-[#667068]">
            Incident date
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            What happened?
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={fieldClass}
              placeholder="Write a factual description in your own words."
            />
          </label>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="Your claim pack"
          detail="After saving, collect the information your insurer requests."
        />
        <ul className="mt-4 space-y-2 text-xs leading-5 text-[#667068]">
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Photos or videos of damage
          </li>
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Receipts, documents and estimates
          </li>
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            A clear incident description and date
          </li>
          <li className="rounded-[14px] bg-[#f6f5ef] px-3 py-2.5">
            Provider contact and policy details
          </li>
        </ul>
        <button
          type="button"
          onClick={save}
          disabled={!type}
          className="mt-4 min-h-12 w-full rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white disabled:opacity-45"
        >
          Save claim pack
        </button>
      </BillsCard>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

export function HomeInsuranceWorkspace({ view }: { view: HomeInsuranceView }) {
  if (view === "cover") return <Cover />;
  if (view === "inventory") return <Inventory />;
  if (view === "high-value") return <Inventory highValueOnly />;
  if (view === "check") return <CoverCheck />;
  if (view === "claim") return <Claim />;
  return <Dashboard />;
}
