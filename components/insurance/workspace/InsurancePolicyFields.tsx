"use client";
import { fieldClass } from "@/components/bills/BillsUi";
import {
  officeInsuranceTypes,
  type InsurancePolicy,
  type OfficeInsuranceType,
  type PolicyStatus,
} from "@/lib/insurance-records";
import type { InsurancePolicyDetailController } from "./useInsurancePolicyDetail";

export function InsurancePolicyFields({
  controller,
}: {
  controller: InsurancePolicyDetailController;
}) {
  const { draft, update } = controller;
  if (!draft) return null;
  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          Policy title
          <input
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
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
          Policy type
          <select
            value={draft.type}
            onChange={(event) =>
              update("type", event.target.value as OfficeInsuranceType)
            }
            className={fieldClass}
          >
            {officeInsuranceTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Policy number (masked)
          <input
            value={draft.policyNumberMasked}
            onChange={(event) =>
              update("policyNumberMasked", event.target.value)
            }
            className={fieldClass}
            placeholder="•••• 1234"
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Starts
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Renews
          <input
            type="date"
            value={draft.renewalDate}
            onChange={(event) => update("renewalDate", event.target.value)}
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
            onChange={(event) => update("premium", Number(event.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Payment frequency
          <select
            value={draft.premiumFrequency}
            onChange={(event) =>
              update(
                "premiumFrequency",
                event.target.value as InsurancePolicy["premiumFrequency"],
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
            onChange={(event) => update("excess", Number(event.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              update("status", event.target.value as PolicyStatus)
            }
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
            onChange={(event) => update("autoRenew", event.target.checked)}
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
          onChange={(event) => update("coverSummary", event.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          Provider phone
          <input
            value={draft.providerPhone}
            onChange={(event) => update("providerPhone", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Provider email
          <input
            type="email"
            value={draft.providerEmail}
            onChange={(event) => update("providerEmail", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Linked home or asset
          <input
            value={draft.linkedAsset}
            onChange={(event) => update("linkedAsset", event.target.value)}
            className={fieldClass}
            placeholder="For example, family home"
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Beneficiaries or review note
          <input
            value={draft.beneficiaries}
            onChange={(event) => update("beneficiaries", event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
    </>
  );
}
