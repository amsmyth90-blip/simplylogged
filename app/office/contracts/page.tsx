import { BottomNav } from "@/components/BottomNav";
import { ContractsWorkspace } from "@/components/contracts/ContractsWorkspace";
import { requireUser } from "@/lib/auth";

export default async function ContractsPage() {
  await requireUser();
  return (
    <>
      <ContractsWorkspace view="dashboard" />
      <BottomNav />
    </>
  );
}
