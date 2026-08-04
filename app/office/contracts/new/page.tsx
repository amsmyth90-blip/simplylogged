import { BottomNav } from "@/components/BottomNav";
import { ContractsWorkspace } from "@/components/contracts/ContractsWorkspace";
import { requireUser } from "@/lib/auth";

export default async function NewContractPage() {
  await requireUser();
  return (
    <>
      <ContractsWorkspace view="new" />
      <BottomNav />
    </>
  );
}
