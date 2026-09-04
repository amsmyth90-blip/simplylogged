"use client";
import { BillsCard, BillsSectionTitle } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import type { InsurancePolicyDetailController } from "./useInsurancePolicyDetail";

export function InsuranceCoverSummary({
  controller,
}: {
  controller: InsurancePolicyDetailController;
}) {
  const { draft } = controller;
  if (!draft) return null;
  return (
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
  );
}
