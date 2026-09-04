import type { OfficeBill } from "@diarydock/office";

import {
  effectiveOfficeBillStatus,
  formatOfficeDate,
  formatOfficeMoney,
} from "./office-bills-format";

export function BillsList({
  bills,
  loadingBillId,
  onEdit,
}: {
  bills: OfficeBill[];
  loadingBillId: string;
  onEdit: (bill: OfficeBill) => Promise<void>;
}) {
  if (!bills.length) {
    return <p className="office-empty">No bills have been added yet.</p>;
  }
  return (
    <div className="office-bill-list">
      {bills.map((bill) => {
        const status = effectiveOfficeBillStatus(bill);
        return (
          <button type="button" className="office-bill-row" key={bill.id}
            disabled={Boolean(loadingBillId)} onClick={() => void onEdit(bill)}>
            <span className={`office-bill-icon office-status-${status}`}>£</span>
            <span>
              <strong>{bill.title}</strong>
              <small>{loadingBillId === bill.id ? "Opening full details…"
                : `${bill.provider || bill.category} · ${formatOfficeDate(bill.dueDate)}`}</small>
            </span>
            <b>{formatOfficeMoney(bill.amount)}</b>
          </button>
        );
      })}
    </div>
  );
}
