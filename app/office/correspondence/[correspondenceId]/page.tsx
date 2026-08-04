import { BottomNav } from "@/components/BottomNav";
import { CorrespondenceWorkspace } from "@/components/correspondence/CorrespondenceWorkspace";
import { requireUser } from "@/lib/auth";

export default async function CorrespondenceDetailPage({
  params,
}: {
  params: Promise<{ correspondenceId: string }>;
}) {
  await requireUser();
  const { correspondenceId } = await params;
  return (
    <>
      <CorrespondenceWorkspace
        view="detail"
        correspondenceId={correspondenceId}
      />
      <BottomNav />
    </>
  );
}
