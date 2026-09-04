import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";
import type { BillRecord } from "@/lib/bill-records";
import { formatBillDate, formatMoney } from "@/lib/bill-records";
import type { BillDetailModel } from "@/components/bills/workspace/useBillDetail";

type Props = Pick<BillDetailModel, "addReminder" | "update"> & {
  draft: BillRecord;
};

function noticeDeadline(bill: BillRecord) {
  if (!bill.contractEndDate || bill.noticePeriodDays === null) return null;
  return new Date(
    new Date(`${bill.contractEndDate}T12:00:00`).getTime() -
      bill.noticePeriodDays * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
}

export function BillDatesCard({ addReminder, draft, update }: Props) {
  const deadline = noticeDeadline(draft);
  return (
    <>
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Dates and reminders"
          detail="Contract details stay as your own reference; DiaryDock does not cancel services for you."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Billing period starts
            <input
              type="date"
              value={draft.billingPeriodStart}
              onChange={(event) =>
                update("billingPeriodStart", event.target.value)
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Billing period ends
            <input
              type="date"
              value={draft.billingPeriodEnd}
              onChange={(event) =>
                update("billingPeriodEnd", event.target.value)
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Contract end date
            <input
              type="date"
              value={draft.contractEndDate}
              onChange={(event) =>
                update("contractEndDate", event.target.value)
              }
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
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Usage shown on bill
            <input
              value={draft.usage}
              onChange={(event) => update("usage", event.target.value)}
              className={fieldClass}
              placeholder="For example, 1,842 kWh"
            />
          </label>
        </div>
        {deadline ? (
          <p className="mt-4 rounded-[14px] bg-[#f0f2e9] px-3 py-2.5 text-xs leading-5 text-[#52705a]">
            Your recorded notice deadline is{" "}
            <strong>{formatBillDate(deadline)}</strong>. Check this against your
            contract before acting.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void addReminder()}
          className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Add due-date reminder
        </button>
      </BillsCard>
      {draft.history.length > 1 ? (
        <BillsCard>
          <BillsSectionTitle
            icon="clock"
            title="Bill history"
            detail="Amounts you previously confirmed for this bill"
          />
          <div className="mt-4 space-y-2">
            {[...draft.history].reverse().map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-[14px] bg-[#f6f5ef] px-3 py-2.5 text-xs"
              >
                <span className="text-[#667068]">
                  {formatBillDate(entry.dueDate)}
                </span>
                <span className="font-semibold text-[#20352a]">
                  {formatMoney(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </BillsCard>
      ) : null}
    </>
  );
}
