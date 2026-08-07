import { BottomNav } from "@/components/BottomNav";
import { CorrespondenceWorkspace } from "@/components/correspondence/CorrespondenceWorkspace";
import { requireUser } from "@/lib/auth";

export default async function NewCorrespondencePage() {
  await requireUser();
  return (
    <>
      <CorrespondenceWorkspace view="new" />
      <BottomNav />
    </>
  );
}
