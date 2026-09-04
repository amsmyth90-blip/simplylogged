"use client";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { contractMonthlyCost } from "@/lib/contract-records";
import { ContractDateFields } from "./ContractDateFields";
import { ContractDocumentPanel } from "./ContractDocumentPanel";
import { ContractOverviewFields } from "./ContractOverviewFields";
import { ContractPaymentFields } from "./ContractPaymentFields";
import { ContractNotice, formatContractMoney } from "./contracts-shared";
import { type ContractDetailTab, useContractDetail } from "./useContractDetail";

const tabs: ContractDetailTab[] = [
  "overview",
  "dates",
  "payments",
  "documents",
];

export function ContractDetail({ contractId }: { contractId: string }) {
  const controller = useContractDetail(contractId);
  const { draft, tab, message, setTab, update, save, addReminder } = controller;
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
  const icon =
    tab === "dates"
      ? "calendar"
      : tab === "payments"
        ? "chart"
        : tab === "documents"
          ? "folder"
          : "file";
  const title =
    tab === "overview"
      ? "Contract information"
      : tab === "dates"
        ? "Dates and renewal"
        : tab === "payments"
          ? "Payments and price history"
          : "Contract documents";
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
            : `${draft.provider || "Provider not recorded"} · ${formatContractMoney(contractMonthlyCost(draft))} monthly equivalent`
        }
        backHref="/office/contracts"
      />
      {draft.reviewStatus === "needs-review" ? (
        <p className="rounded-[18px] border border-[#d8c9ad] bg-[#f4ead7] px-4 py-3 text-[12px] leading-5 text-[#6f604a]">
          <strong>Check before saving.</strong> DiaryDock&apos;s document read
          is a helpful starting point and may contain mistakes.
        </p>
      ) : null}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold capitalize ${tab === item ? "bg-[#355540] text-white" : "bg-white text-[#52705a]"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <BillsCard>
        <BillsSectionTitle icon={icon} title={title} />
        {tab === "overview" ? (
          <ContractOverviewFields controller={controller} />
        ) : null}
        {tab === "dates" ? (
          <ContractDateFields controller={controller} />
        ) : null}
        {tab === "payments" ? (
          <ContractPaymentFields controller={controller} />
        ) : null}
        {tab === "documents" ? (
          <ContractDocumentPanel controller={controller} />
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
