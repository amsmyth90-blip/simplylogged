"use client";

import { BillsHeader, BillsShell } from "@/components/bills/BillsUi";

import { LifeInsuranceNotice, NoLifePolicy } from "./life-insurance-shared";
import { BeneficiariesPanel, LinkedPeoplePanel, TrustPanel } from "./LifeBeneficiaryPanels";
import { useLifeBeneficiariesController } from "./useLifeBeneficiariesController";

export function LifeInsuranceBeneficiaries() {
  const controller = useLifeBeneficiariesController();
  if (!controller.policy) {
    return (
      <BillsShell>
        <BillsHeader title="Beneficiaries & Family" subtitle="Keep beneficiary and trust notes organised." backHref="/office/insurance/life" />
        <NoLifePolicy />
      </BillsShell>
    );
  }
  return (
    <BillsShell>
      <BillsHeader title="Beneficiaries & Family" subtitle="Record who is named, percentage notes and the people connected with this policy." backHref="/office/insurance/life" />
      <BeneficiariesPanel controller={controller} />
      <TrustPanel controller={controller} />
      <LinkedPeoplePanel controller={controller} />
      <LifeInsuranceNotice />
    </BillsShell>
  );
}
