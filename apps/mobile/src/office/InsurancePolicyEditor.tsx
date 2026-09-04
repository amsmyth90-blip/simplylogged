import { useState } from "react";

import {
  officeInsuranceTypes,
  officePolicyStatuses,
  officePremiumFrequencies,
  type OfficeInsurancePolicy,
  type SaveOfficeInsurancePolicy,
} from "@diarydock/office";
import { useOfficeModal } from "./use-office-modal";

function emptyPolicy(): SaveOfficeInsurancePolicy {
  return {
    title: "",
    type: "Home",
    provider: "",
    policyNumberMasked: "",
    status: "draft",
    startDate: "",
    renewalDate: "",
    premium: 0,
    premiumFrequency: "annual",
    autoRenew: false,
    coverSummary: "",
    coverItems: [],
    excess: 0,
    providerPhone: "",
    providerEmail: "",
    linkedPeople: [],
    linkedAsset: "",
    beneficiaries: "",
    notes: "",
  };
}

function editable(policy: OfficeInsurancePolicy | null): SaveOfficeInsurancePolicy {
  if (!policy) return emptyPolicy();
  const { contentComplete, id, documentId, history, reviewStatus, createdAt, updatedAt,
    ...fields } = policy;
  void contentComplete; void id; void documentId; void history; void reviewStatus;
  void createdAt; void updatedAt;
  return fields;
}

type Props = {
  busy: boolean;
  policy: OfficeInsurancePolicy | null;
  onAddReminder: (policy: SaveOfficeInsurancePolicy) => Promise<void>;
  onCancel: () => void;
  onSave: (policy: SaveOfficeInsurancePolicy) => Promise<boolean>;
};

export function InsurancePolicyEditor(props: Props) {
  useOfficeModal();
  const [draft, setDraft] = useState(() => editable(props.policy));
  const update = <Key extends keyof SaveOfficeInsurancePolicy>(
    key: Key,
    value: SaveOfficeInsurancePolicy[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="office-editor" role="dialog" aria-modal="true" aria-label={props.policy ? "Edit policy" : "Add policy"}>
      <div className="office-editor-heading">
        <div><p>Office insurance</p><h2>{props.policy ? "Check policy details" : "Add a policy"}</h2></div>
        <button type="button" onClick={props.onCancel} aria-label="Close policy editor">×</button>
      </div>
      {props.policy?.reviewStatus === "needs-review" ? (
        <p className="office-advisory"><strong>Check before saving.</strong> Compare every detail with the original policy document.</p>
      ) : null}
      <div className="office-form-grid">
        <label>Policy title<input value={draft.title} maxLength={160} onChange={(event) => update("title", event.target.value)} /></label>
        <label>Provider<input value={draft.provider} maxLength={160} onChange={(event) => update("provider", event.target.value)} /></label>
        <label>Policy type<select value={draft.type} onChange={(event) => update("type", event.target.value as SaveOfficeInsurancePolicy["type"])}>{officeInsuranceTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Policy number<input value={draft.policyNumberMasked} maxLength={80} placeholder="•••• 1234" onChange={(event) => update("policyNumberMasked", event.target.value)} /></label>
        <label>Starts<input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
        <label>Renews<input type="date" value={draft.renewalDate} onChange={(event) => update("renewalDate", event.target.value)} /></label>
        <label>Premium (£)<input type="number" min="0" step="0.01" value={draft.premium || ""} onChange={(event) => update("premium", Number(event.target.value))} /></label>
        <label>Payment frequency<select value={draft.premiumFrequency} onChange={(event) => update("premiumFrequency", event.target.value as SaveOfficeInsurancePolicy["premiumFrequency"])}>{officePremiumFrequencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Excess (£)<input type="number" min="0" step="0.01" value={draft.excess || ""} onChange={(event) => update("excess", Number(event.target.value))} /></label>
        <label>Status<select value={draft.status} onChange={(event) => update("status", event.target.value as SaveOfficeInsurancePolicy["status"])}>{officePolicyStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="office-check"><input type="checkbox" checked={draft.autoRenew} onChange={(event) => update("autoRenew", event.target.checked)} />Automatically renews</label>
      </div>
      <h3>Cover and contacts</h3>
      <div className="office-form-grid">
        <label className="office-wide">Plain-language cover note<textarea rows={3} value={draft.coverSummary} maxLength={4000} onChange={(event) => update("coverSummary", event.target.value)} /></label>
        <label>Provider phone<input type="tel" value={draft.providerPhone} maxLength={80} onChange={(event) => update("providerPhone", event.target.value)} /></label>
        <label>Provider email<input type="email" value={draft.providerEmail} maxLength={254} onChange={(event) => update("providerEmail", event.target.value)} /></label>
        <label>Linked home or asset<input value={draft.linkedAsset} maxLength={240} onChange={(event) => update("linkedAsset", event.target.value)} /></label>
        <label>Linked people<input value={draft.linkedPeople.join(", ")} maxLength={1000} onChange={(event) => update("linkedPeople", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 50))} /></label>
        <label className="office-wide">Beneficiaries or review note<textarea rows={2} value={draft.beneficiaries} maxLength={2000} onChange={(event) => update("beneficiaries", event.target.value)} /></label>
        <label className="office-wide">Notes<textarea rows={3} value={draft.notes} maxLength={4000} onChange={(event) => update("notes", event.target.value)} /></label>
      </div>
      {draft.coverItems.length ? (
        <div className="office-cover-items">
          <h3>Document cover summary</h3>
          {draft.coverItems.map((item) => <p key={item.id} className={item.included ? "included" : "excluded"}><strong>{item.label}</strong><span>{item.value}</span></p>)}
        </div>
      ) : null}
      <p className="office-advisory">DiaryDock organises factual policy information. It does not recommend cover or replace the original policy wording.</p>
      <div className="office-editor-actions">
        <button type="button" disabled={props.busy} onClick={() => void props.onSave(draft)}>{props.busy ? "Saving…" : props.policy?.reviewStatus === "needs-review" ? "Confirm and save" : "Save policy"}</button>
        {draft.renewalDate ? <button className="office-secondary" type="button" disabled={props.busy} onClick={() => void props.onAddReminder(draft)}>Add renewal reminder</button> : null}
      </div>
    </section>
  );
}
