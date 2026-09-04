"use client";
import { fieldClass } from "@/components/bills/BillsUi";
import { formatDate } from "@/lib/presentation";
import { cancellationDeadline } from "./contracts-shared";
import type { ContractDetailController } from "./useContractDetail";

export function ContractDateFields({
  controller,
}: {
  controller: ContractDetailController;
}) {
  const { draft, update } = controller;
  if (!draft) return null;
  const deadline = cancellationDeadline(draft);
  return (
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
          onChange={(event) => update("minimumTermEnd", event.target.value)}
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
          onChange={(event) => update("promotionalEndDate", event.target.value)}
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
      {deadline ? (
        <p className="rounded-[14px] bg-[#f0f2e9] px-3 py-2.5 text-xs leading-5 text-[#52705a] sm:col-span-2">
          Your calculated notice deadline is{" "}
          <strong>{formatDate(deadline)}</strong>. Confirm this against the
          provider&apos;s terms.
        </p>
      ) : null}
    </div>
  );
}
