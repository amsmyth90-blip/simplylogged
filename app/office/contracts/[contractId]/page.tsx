import { BottomNav } from "@/components/BottomNav";
import { ContractsWorkspace } from "@/components/contracts/ContractsWorkspace";
import { requireUser } from "@/lib/auth";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  await requireUser();
  const { contractId } = await params;
  return (
    <>
      <ContractsWorkspace view="detail" contractId={contractId} />
      <BottomNav />
    </>
  );
}
