import { useState } from "react";

import {
  officeBillCategories,
  officeBillFrequencies,
  officeBillStatuses,
  type OfficeBill,
  type SaveOfficeBill,
} from "@diarydock/office";
import { useOfficeModal } from "./use-office-modal";

function emptyBill(): SaveOfficeBill {
  return {
    title: "",
    provider: "",
    category: "Other",
    accountNumberMasked: "",
    amount: 0,
    dueDate: "",
    frequency: "one-off",
    paymentMethod: "",
    directDebit: false,
    status: "draft",
    billingPeriodStart: "",
    billingPeriodEnd: "",
    contractEndDate: "",
    noticePeriodDays: null,
    usage: "",
    notes: "",
  };
}

function editable(bill: OfficeBill | null): SaveOfficeBill {
  if (!bill) return emptyBill();
  const { contentComplete, id, documentId, history, reviewStatus, updatedAt, ...fields } = bill;
  void contentComplete; void id; void documentId; void history; void reviewStatus; void updatedAt;
  return fields;
}

type Props = {
  bill: OfficeBill | null;
  busy: boolean;
  onAddReminder: (bill: SaveOfficeBill) => Promise<void>;
  onCancel: () => void;
  onSave: (bill: SaveOfficeBill) => Promise<boolean>;
};

export function BillEditor({ bill, busy, onAddReminder, onCancel, onSave }: Props) {
  useOfficeModal();
  const [draft, setDraft] = useState(() => editable(bill));
  const update = <Key extends keyof SaveOfficeBill>(key: Key, value: SaveOfficeBill[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="office-editor" role="dialog" aria-modal="true" aria-label={bill ? "Edit bill" : "Add bill"}>
      <div className="office-editor-heading">
        <div><p>Office bills</p><h2>{bill ? "Check bill details" : "Add a bill"}</h2></div>
        <button type="button" onClick={onCancel} aria-label="Close bill editor">×</button>
      </div>
      <div className="office-form-grid">
        <label>Bill title<input value={draft.title} maxLength={160} onChange={(event) => update("title", event.target.value)} /></label>
        <label>Provider<input value={draft.provider} maxLength={160} onChange={(event) => update("provider", event.target.value)} /></label>
        <label>Category<select value={draft.category} onChange={(event) => update("category", event.target.value as SaveOfficeBill["category"])}>{officeBillCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Amount (£)<input type="number" min="0" step="0.01" value={draft.amount || ""} onChange={(event) => update("amount", Number(event.target.value))} /></label>
        <label>Due date<input type="date" value={draft.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></label>
        <label>Frequency<select value={draft.frequency} onChange={(event) => update("frequency", event.target.value as SaveOfficeBill["frequency"])}>{officeBillFrequencies.map((item) => <option value={item} key={item}>{item.replace("one-off", "One-off")}</option>)}</select></label>
        <label>Account reference<input value={draft.accountNumberMasked} maxLength={80} placeholder="•••• 1234" onChange={(event) => update("accountNumberMasked", event.target.value)} /></label>
        <label>Payment method<input value={draft.paymentMethod} maxLength={120} onChange={(event) => update("paymentMethod", event.target.value)} /></label>
        <label>Status<select value={draft.status} onChange={(event) => update("status", event.target.value as SaveOfficeBill["status"])}>{officeBillStatuses.filter((item) => item !== "overdue").map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label className="office-check"><input type="checkbox" checked={draft.directDebit} onChange={(event) => update("directDebit", event.target.checked)} />Paid by Direct Debit</label>
      </div>
      <h3>Dates and reference</h3>
      <div className="office-form-grid">
        <label>Billing starts<input type="date" value={draft.billingPeriodStart} onChange={(event) => update("billingPeriodStart", event.target.value)} /></label>
        <label>Billing ends<input type="date" value={draft.billingPeriodEnd} onChange={(event) => update("billingPeriodEnd", event.target.value)} /></label>
        <label>Contract ends<input type="date" value={draft.contractEndDate} onChange={(event) => update("contractEndDate", event.target.value)} /></label>
        <label>Notice period<input type="number" min="0" max="3650" value={draft.noticePeriodDays ?? ""} onChange={(event) => update("noticePeriodDays", event.target.value ? Number(event.target.value) : null)} /></label>
        <label className="office-wide">Usage shown<input value={draft.usage} maxLength={240} onChange={(event) => update("usage", event.target.value)} /></label>
        <label className="office-wide">Notes<textarea rows={3} value={draft.notes} maxLength={4000} onChange={(event) => update("notes", event.target.value)} /></label>
      </div>
      <div className="office-editor-actions">
        <button type="button" disabled={busy} onClick={() => void onSave(draft)}>{busy ? "Saving…" : bill?.reviewStatus === "needs-review" ? "Confirm and save" : "Save bill"}</button>
        {draft.dueDate ? <button className="office-secondary" type="button" disabled={busy} onClick={() => void onAddReminder(draft)}>Add due-date reminder</button> : null}
      </div>
    </section>
  );
}
