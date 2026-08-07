import { BottomNav } from "@/components/BottomNav";
import { LifeInsuranceWorkspace } from "@/components/insurance/LifeInsuranceWorkspace";
import { requireUser } from "@/lib/auth";
export default async function FamilyClaimPackPage() {
  await requireUser();
  return (
    <>
      <LifeInsuranceWorkspace view="claim-pack" />
      <BottomNav />
    </>
  );
}
