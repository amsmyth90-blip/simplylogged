"use client";

import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { BillsCard, BillsHeader, BillsSectionTitle, BillsShell, fieldClass } from "@/components/bills/BillsUi";
import { formatMoney } from "@/lib/bill-records";

import {
  HomeInsuranceNotice,
  NoHomePolicy,
  parseCoverValue,
  useHomePolicy
} from "./home-insurance-shared";

export function HomeInsuranceCoverCheck() {
  const { state, updateState } = useDiaryDockData();
  const policy = useHomePolicy();
  const stored = policy
    ? state.insurance.homeCoverChecks.find(check => check.policyId === policy.id)
    : undefined;
  const [draft, setDraft] = useState({
    estimatedRebuildCost: stored?.estimatedRebuildCost || 0,
    recentHomeChanges: stored?.recentHomeChanges || ""
  });
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title="Cover Check" subtitle="Compare information you have recorded." backHref="/office/insurance/home" />
        <NoHomePolicy />
      </BillsShell>
    );
  }
  const items = state.insurance.homeInventory.filter(item => item.policyId === policy.id);
  const inventoryTotal = items.reduce((sum, item) => sum + item.estimatedValue * item.quantity, 0);
  const contentsLimit = parseCoverValue(policy.coverItems.find(item => /contents/i.test(item.label))?.value || "");
  const buildingsLimit = parseCoverValue(policy.coverItems.find(item => /building/i.test(item.label))?.value || "");
  const save = () => {
    const check = { policyId: policy.id, ...draft, lastReviewedAt: new Date().toISOString() };
    updateState(current => ({
      ...current,
      insurance: {
        ...current.insurance,
        homeCoverChecks: [
          check,
          ...current.insurance.homeCoverChecks.filter(item => item.policyId !== policy.id)
        ]
      }
    }));
  };
  const contentsDifference = contentsLimit - inventoryTotal;
  const buildingsDifference = buildingsLimit - draft.estimatedRebuildCost;
  return (
    <BillsShell>
      <BillsHeader title="Cover Check" subtitle="Compare your recorded inventory and rebuild estimate with recorded policy limits." backHref="/office/insurance/home" />
      <BillsCard>
        <BillsSectionTitle icon="archive" title="Contents check" detail="Based only on inventory values you entered" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CoverFigure label="Inventory total" value={formatMoney(inventoryTotal)} />
          <CoverFigure label="Recorded contents limit" value={contentsLimit ? formatMoney(contentsLimit) : "Not recorded"} />
        </div>
        <p className={`mt-4 rounded-[14px] px-3 py-3 text-xs leading-5 ${contentsLimit && contentsDifference < 0 ? "bg-[#f7e4df] text-[#80493f]" : "bg-[#f0f2e9] text-[#52705a]"}`}>
          {!contentsLimit
            ? "Add a contents cover value to your policy record before comparing."
            : contentsDifference < 0
              ? `Your recorded inventory is ${formatMoney(Math.abs(contentsDifference))} above the recorded contents limit. Review the source values and speak to your provider if needed.`
              : `The recorded contents limit is ${formatMoney(contentsDifference)} above your current inventory total. This is not an adequacy assessment.`}
        </p>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle icon="home" title="Buildings check" detail="Use a professional rebuild estimate rather than the market value of your home." />
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Estimated rebuild cost (£)
          <input type="number" min="0" value={draft.estimatedRebuildCost || ""} onChange={event => setDraft({ ...draft, estimatedRebuildCost: Number(event.target.value) })} className={fieldClass} />
        </label>
        <p className="mt-3 rounded-[14px] bg-[#f6f5ef] px-3 py-3 text-xs leading-5 text-[#667068]">
          Recorded buildings limit: <strong>{buildingsLimit ? formatMoney(buildingsLimit) : "Not recorded"}</strong>
          {buildingsLimit && draft.estimatedRebuildCost ? ` · Difference: ${formatMoney(buildingsDifference)}` : ""}
        </p>
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Recent home changes
          <textarea rows={4} value={draft.recentHomeChanges} onChange={event => setDraft({ ...draft, recentHomeChanges: event.target.value })} className={fieldClass} placeholder="Extension, renovation, garden office, new valuables…" />
        </label>
        <button type="button" onClick={save} className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white">Save cover check</button>
      </BillsCard>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}

function CoverFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[15px] bg-[#f6f5ef] p-3">
      <p className="text-[10px] text-[#667068]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#20352a]">{value}</p>
    </div>
  );
}
