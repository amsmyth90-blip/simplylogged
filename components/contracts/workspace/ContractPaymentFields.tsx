"use client";
import { fieldClass } from "@/components/bills/BillsUi";
import type { ContractRecord } from "@/lib/contract-records";
import { formatDate } from "@/lib/presentation";
import { formatContractMoney } from "./contracts-shared";
import type { ContractDetailController } from "./useContractDetail";

export function ContractPaymentFields({
  controller,
}: {
  controller: ContractDetailController;
}) {
  const { draft, update } = controller;
  if (!draft) return null;
  return (
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
            onChange={(event) => update("paymentMethod", event.target.value)}
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
                  {formatContractMoney(entry.amount)}
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
  );
}
