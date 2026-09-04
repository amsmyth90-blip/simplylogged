"use client";

import { LifeInsuranceBeneficiaries } from "./life-insurance/LifeInsuranceBeneficiaries";
import { LifeInsuranceClaimPack } from "./life-insurance/LifeInsuranceClaimPack";
import { LifeInsuranceCover } from "./life-insurance/LifeInsuranceCover";
import { LifeInsuranceDashboard } from "./life-insurance/LifeInsuranceDashboard";
import type { LifeInsuranceView } from "./life-insurance/life-insurance-shared";

export function LifeInsuranceWorkspace({ view }: { view: LifeInsuranceView }) {
  if (view === "cover") return <LifeInsuranceCover />;
  if (view === "beneficiaries") return <LifeInsuranceBeneficiaries />;
  if (view === "claim-pack") return <LifeInsuranceClaimPack />;
  return <LifeInsuranceDashboard />;
}
