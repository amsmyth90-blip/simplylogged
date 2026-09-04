import type {
  OfficeInsuranceClaim,
  OfficeInsurancePolicy,
  OfficeInsuranceSnapshot,
} from "@diarydock/office";

import { formatOfficeDate, formatOfficeMoney } from "./office-bills-format";

export function InsurancePanel({
  snapshot,
  loadingClaimId,
  loadingPolicyId,
  onEditClaim,
  onEditPolicy,
}: {
  snapshot: OfficeInsuranceSnapshot | null;
  loadingClaimId: string;
  loadingPolicyId: string;
  onEditClaim: (claim: OfficeInsuranceClaim | null) => void;
  onEditPolicy: (policy: OfficeInsurancePolicy | null) => void | Promise<void>;
}) {
  const policies = snapshot?.policies ?? [];
  const claims = snapshot?.claims ?? [];
  return (
    <>
      <div className="office-section-heading">
        <div><p>Insurance hub</p><h2>Your policies</h2></div>
        <button type="button" onClick={() => onEditPolicy(null)}>＋ Add</button>
      </div>
      <div className="office-policy-list">
        {policies.length ? policies.map((policy) => (
          <button type="button" className="office-policy-row" key={policy.id}
            disabled={Boolean(loadingPolicyId)} onClick={() => void onEditPolicy(policy)}>
            <span className={`office-policy-icon office-policy-${policy.status}`}>◇</span>
            <span><strong>{policy.title}</strong><small>{loadingPolicyId === policy.id
              ? "Opening full details…" : `${policy.provider || policy.type} · ${policy.renewalDate
                ? `Renews ${formatOfficeDate(policy.renewalDate)}` : "No renewal date"}`}</small></span>
            <b>{formatOfficeMoney(policy.premium)}<small>/{policy.premiumFrequency === "annual" ? "yr" : policy.premiumFrequency === "monthly" ? "mo" : "once"}</small></b>
          </button>
        )) : <p className="office-empty">No insurance policies have been added yet.</p>}
      </div>
      <div className="office-section-heading office-claims-heading">
        <div><p>Claims centre</p><h2>Your claims</h2></div>
        <button type="button" disabled={!policies.length} onClick={() => onEditClaim(null)}>＋ Add</button>
      </div>
      <div className="office-claim-list">
        {claims.length ? claims.map((claim) => {
          const policy = policies.find((item) => item.id === claim.policyId);
          return (
            <button type="button" className="office-claim-row" key={claim.id}
              disabled={Boolean(loadingClaimId)} onClick={() => onEditClaim(claim)}>
              <span><strong>{claim.title}</strong><small>{loadingClaimId === claim.id
                ? "Opening full details…" : `${policy?.title ?? "Policy"} · ${formatOfficeDate(claim.incidentDate)}`}</small></span>
              <b>{claim.status.replace("-", " ")}</b>
            </button>
          );
        }) : <p className="office-empty">No claims recorded.</p>}
      </div>
      <p className="office-advisory">Check policy wording and renewal details with your provider. DiaryDock is not an insurer, broker or financial adviser.</p>
    </>
  );
}
