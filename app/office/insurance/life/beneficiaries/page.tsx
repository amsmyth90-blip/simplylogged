import { BottomNav } from "@/components/BottomNav";
import { LifeInsuranceWorkspace } from "@/components/insurance/LifeInsuranceWorkspace";
import { requireUser } from "@/lib/auth";
export default async function LifeBeneficiariesPage() {
  await requireUser();
  return (
    <>
      <LifeInsuranceWorkspace view="beneficiaries" />
      <BottomNav />
    </>
  );
}
