"use client";

import { InsuranceClaims } from "./workspace/InsuranceClaims";
import { InsuranceCompare } from "./workspace/InsuranceCompare";
import { InsuranceDashboard } from "./workspace/InsuranceDashboard";
import { InsurancePolicies } from "./workspace/InsurancePolicies";
import { InsurancePolicyDetail } from "./workspace/InsurancePolicyDetail";
import { InsuranceReview } from "./workspace/InsuranceReview";
import type { InsuranceView } from "./workspace/insurance-shared";
import { NewInsurancePolicy } from "./workspace/NewInsurancePolicy";

export function InsuranceWorkspace({
  view,
  policyId,
}: {
  view: InsuranceView;
  policyId?: string;
}) {
  if (view === "policies") return <InsurancePolicies />;
  if (view === "new") return <NewInsurancePolicy />;
  if (view === "detail" && policyId)
    return <InsurancePolicyDetail policyId={policyId} />;
  if (view === "claims") return <InsuranceClaims />;
  if (view === "compare") return <InsuranceCompare />;
  if (view === "review") return <InsuranceReview />;
  return <InsuranceDashboard />;
}
