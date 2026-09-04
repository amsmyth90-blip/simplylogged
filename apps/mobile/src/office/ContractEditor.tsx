import { useState } from "react";

import {
  officeContractCategories,
  officeContractFrequencies,
  officeContractStatuses,
  type OfficeContract,
  type SaveOfficeContract,
} from "@diarydock/office";

import { useOfficeModal } from "./use-office-modal";

function emptyContract(): SaveOfficeContract {
  return {
    serviceName: "",
    provider: "",
    category: "Other",
    status: "draft",
    accountEmail: "",
    accountNumberMasked: "",
    cost: 0,
    frequency: "monthly",
    paymentMethod: "",
    startDate: "",
    minimumTermEnd: "",
    renewalDate: "",
    noticePeriodDays: null,
    autoRenew: false,
    promotionalPrice: null,
    promotionalEndDate: "",
    cancellationInstructions: "",
    notes: "",
  };
}

function editable(contract: OfficeContract | null): SaveOfficeContract {
  if (!contract) return emptyContract();
  const { contentComplete, id, documentId, lastReviewedAt, priceHistory,
    reviewStatus, updatedAt, ...fields } = contract;
  void contentComplete; void id; void documentId; void lastReviewedAt;
  void priceHistory; void reviewStatus; void updatedAt;
  return fields;
}

type Props = {
  busy: boolean;
  contract: OfficeContract | null;
  onAddReminder: (contract: SaveOfficeContract) => Promise<void>;
  onCancel: () => void;
  onSave: (contract: SaveOfficeContract) => Promise<boolean>;
};

export function ContractEditor({ busy, contract, onAddReminder, onCancel, onSave }: Props) {
  useOfficeModal();
  const [draft, setDraft] = useState(() => editable(contract));
  const update = <Key extends keyof SaveOfficeContract>(key: Key, value: SaveOfficeContract[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="office-editor" role="dialog" aria-modal="true"
      aria-label={contract ? "Edit contract" : "Add contract"}>
      <div className="office-editor-heading">
        <div><p>Office contracts</p><h2>{contract ? "Check contract details" : "Add a contract"}</h2></div>
        <button type="button" onClick={onCancel} aria-label="Close contract editor">×</button>
      </div>
      <p className="office-advisory">DiaryDock organises the details you record. Confirm prices,
        notice periods and cancellation terms against the original contract.</p>
      <div className="office-form-grid">
        <label>Service name<input value={draft.serviceName} maxLength={160}
          onChange={(event) => update("serviceName", event.target.value)} /></label>
        <label>Provider<input value={draft.provider} maxLength={160}
          onChange={(event) => update("provider", event.target.value)} /></label>
        <label>Category<select value={draft.category}
          onChange={(event) => update("category", event.target.value as SaveOfficeContract["category"])}>
          {officeContractCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Status<select value={draft.status}
          onChange={(event) => update("status", event.target.value as SaveOfficeContract["status"])}>
          {officeContractStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Cost (£)<input type="number" min="0" step="0.01" value={draft.cost || ""}
          onChange={(event) => update("cost", Number(event.target.value))} /></label>
        <label>Frequency<select value={draft.frequency}
          onChange={(event) => update("frequency", event.target.value as SaveOfficeContract["frequency"])}>
          {officeContractFrequencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Account email<input type="email" value={draft.accountEmail} maxLength={254}
          onChange={(event) => update("accountEmail", event.target.value)} /></label>
        <label>Account reference<input value={draft.accountNumberMasked} maxLength={80}
          placeholder="•••• 1234" onChange={(event) => update("accountNumberMasked", event.target.value)} /></label>
        <label>Payment method<input value={draft.paymentMethod} maxLength={120}
          onChange={(event) => update("paymentMethod", event.target.value)} /></label>
        <label className="office-check"><input type="checkbox" checked={draft.autoRenew}
          onChange={(event) => update("autoRenew", event.target.checked)} />Auto-renews</label>
      </div>
      <h3>Dates and cancellation</h3>
      <div className="office-form-grid">
        <label>Start date<input type="date" value={draft.startDate}
          onChange={(event) => update("startDate", event.target.value)} /></label>
        <label>Minimum term ends<input type="date" value={draft.minimumTermEnd}
          onChange={(event) => update("minimumTermEnd", event.target.value)} /></label>
        <label>Renewal date<input type="date" value={draft.renewalDate}
          onChange={(event) => update("renewalDate", event.target.value)} /></label>
        <label>Notice period (days)<input type="number" min="0" max="3650"
          value={draft.noticePeriodDays ?? ""} onChange={(event) => update("noticePeriodDays",
            event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Promotional price (£)<input type="number" min="0" step="0.01"
          value={draft.promotionalPrice ?? ""} onChange={(event) => update("promotionalPrice",
            event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Promotion ends<input type="date" value={draft.promotionalEndDate}
          onChange={(event) => update("promotionalEndDate", event.target.value)} /></label>
        <label className="office-wide">Cancellation instructions<textarea rows={3}
          value={draft.cancellationInstructions} maxLength={2000}
          onChange={(event) => update("cancellationInstructions", event.target.value)} /></label>
        <label className="office-wide">Notes<textarea rows={3} value={draft.notes} maxLength={4000}
          onChange={(event) => update("notes", event.target.value)} /></label>
      </div>
      <div className="office-editor-actions">
        <button type="button" disabled={busy} onClick={() => void onSave(draft)}>
          {busy ? "Saving…" : contract?.reviewStatus === "needs-review" ? "Confirm and save" : "Save contract"}
        </button>
        {draft.renewalDate ? <button className="office-secondary" type="button" disabled={busy}
          onClick={() => void onAddReminder(draft)}>Add renewal reminder</button> : null}
      </div>
    </section>
  );
}
