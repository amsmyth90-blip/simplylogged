import { BottomNav } from "@/components/BottomNav";
import { CorrespondenceWorkspace } from "@/components/correspondence/CorrespondenceWorkspace";
import { requireUser } from "@/lib/auth";

export default async function CorrespondencePage() {
  await requireUser();
  return (
    <>
      <CorrespondenceWorkspace view="dashboard" />
      <BottomNav />
    </>
  );
}
