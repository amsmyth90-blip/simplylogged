"use client";
import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { InsuranceCoverSummary } from "./InsuranceCoverSummary";
import { InsuranceNotice } from "./insurance-shared";
import { InsurancePolicyFields } from "./InsurancePolicyFields";
import { useInsurancePolicyDetail } from "./useInsurancePolicyDetail";

export function InsurancePolicyDetail({ policyId }: { policyId: string }) {
  const controller = useInsurancePolicyDetail(policyId);
  const { policy, draft, message, save, remind, view } = controller;
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
        <InsurancePolicyFields controller={controller} />
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
      <InsuranceCoverSummary controller={controller} />
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
