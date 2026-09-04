import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";
import type { BillRecord, BillStatus } from "@/lib/bill-records";
import { billCategories } from "@/lib/bill-records";
import type { BillDetailModel } from "@/components/bills/workspace/useBillDetail";

type Props = Pick<
  BillDetailModel,
  "message" | "opening" | "save" | "update" | "viewDocument"
> & {
  draft: BillRecord;
};

export function BillDetailsCard({
  draft,
  message,
  opening,
  save,
  update,
  viewDocument,
}: Props) {
  return (
    <BillsCard>
      <BillsSectionTitle
        icon="file"
        title="Bill details"
        detail="Only the details you confirm are used in totals and reminders."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          Bill title
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
          Category
          <select
            value={draft.category}
            onChange={(event) =>
              update("category", event.target.value as BillRecord["category"])
            }
            className={fieldClass}
          >
            {billCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Amount (£)
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount || ""}
            onChange={(event) => update("amount", Number(event.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Due date
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) => update("dueDate", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Frequency
          <select
            value={draft.frequency}
            onChange={(event) =>
              update("frequency", event.target.value as BillRecord["frequency"])
            }
            className={fieldClass}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="one-off">One-off</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Account reference (masked)
          <input
            value={draft.accountNumberMasked}
            onChange={(event) =>
              update("accountNumberMasked", event.target.value)
            }
            className={fieldClass}
            placeholder="•••• 1234"
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Payment method
          <input
            value={draft.paymentMethod}
            onChange={(event) => update("paymentMethod", event.target.value)}
            className={fieldClass}
            placeholder="Direct Debit, card, manual…"
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
          <input
            type="checkbox"
            checked={draft.directDebit}
            onChange={(event) => update("directDebit", event.target.checked)}
            className="h-4 w-4 accent-[#45604d]"
          />
          Paid by Direct Debit
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              update("status", event.target.value as BillStatus)
            }
            className={fieldClass}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
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
            onClick={() => void viewDocument()}
            disabled={opening}
            className="min-h-12 flex-1 rounded-[15px] border border-[#6f8e72]/35 px-4 text-sm font-semibold text-[#45604d]"
          >
            {opening ? "Opening…" : "View original bill"}
          </button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="mt-3 text-xs font-semibold text-[#52705a]">
          {message}
        </p>
      ) : null}
    </BillsCard>
  );
}
