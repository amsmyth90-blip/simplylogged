import { useState } from "react";

import {
  officeClaimStatuses,
  type OfficeInsuranceClaim,
  type OfficeInsurancePolicy,
  type SaveOfficeInsuranceClaim,
} from "@diarydock/office";
import { useOfficeModal } from "./use-office-modal";

function editable(
  claim: OfficeInsuranceClaim | null,
  policies: OfficeInsurancePolicy[],
): SaveOfficeInsuranceClaim {
  if (!claim) return {
    policyId: policies[0]?.id ?? "",
    title: "",
    claimNumberMasked: "",
    incidentDate: "",
    status: "draft",
    description: "",
  };
  const { contentComplete, id, evidenceDocumentIds, createdAt, updatedAt, ...fields } = claim;
  void contentComplete; void id; void evidenceDocumentIds; void createdAt; void updatedAt;
  return fields;
}

type Props = {
  busy: boolean;
  claim: OfficeInsuranceClaim | null;
  policies: OfficeInsurancePolicy[];
  onCancel: () => void;
  onSave: (claim: SaveOfficeInsuranceClaim) => Promise<boolean>;
};

export function InsuranceClaimEditor(props: Props) {
  useOfficeModal();
  const [draft, setDraft] = useState(() => editable(props.claim, props.policies));
  const update = <Key extends keyof SaveOfficeInsuranceClaim>(
    key: Key,
    value: SaveOfficeInsuranceClaim[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="office-editor office-claim-editor" role="dialog" aria-modal="true" aria-label={props.claim ? "Edit claim" : "Add claim"}>
      <div className="office-editor-heading">
        <div><p>Claims centre</p><h2>{props.claim ? "Update claim" : "Record a claim"}</h2></div>
        <button type="button" onClick={props.onCancel} aria-label="Close claim editor">×</button>
      </div>
      <div className="office-form-grid">
        <label>Policy<select value={draft.policyId} onChange={(event) => update("policyId", event.target.value)}><option value="">Choose a policy</option>{props.policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}</select></label>
        <label>Claim title<input value={draft.title} maxLength={160} onChange={(event) => update("title", event.target.value)} /></label>
        <label>Claim number<input value={draft.claimNumberMasked} maxLength={80} placeholder="•••• 1234" onChange={(event) => update("claimNumberMasked", event.target.value)} /></label>
        <label>Incident date<input type="date" value={draft.incidentDate} onChange={(event) => update("incidentDate", event.target.value)} /></label>
        <label>Status<select value={draft.status} onChange={(event) => update("status", event.target.value as SaveOfficeInsuranceClaim["status"])}>{officeClaimStatuses.map((item) => <option key={item} value={item}>{item.replace("-", " ")}</option>)}</select></label>
        <label className="office-wide">Description<textarea rows={5} value={draft.description} maxLength={4000} onChange={(event) => update("description", event.target.value)} /></label>
      </div>
      {props.claim?.evidenceDocumentIds.length ? <p className="office-advisory">{props.claim.evidenceDocumentIds.length} evidence file{props.claim.evidenceDocumentIds.length === 1 ? " is" : "s are"} securely linked to this claim.</p> : null}
      <p className="office-advisory">DiaryDock stores your own record. It does not submit the claim or contact an insurer.</p>
      <div className="office-editor-actions">
        <button type="button" disabled={props.busy || !draft.policyId || !draft.title.trim()} onClick={() => void props.onSave(draft)}>{props.busy ? "Saving…" : "Save claim record"}</button>
      </div>
    </section>
  );
}
