import { BottomNav } from "@/components/BottomNav";
import { ProfessionalContactsWorkspace } from "@/components/contacts/ProfessionalContactsWorkspace";
import { requireUser } from "@/lib/auth";

export default async function ImportProfessionalContactsPage() {
  await requireUser();
  return (
    <>
      <ProfessionalContactsWorkspace view="import" />
      <BottomNav />
    </>
  );
}
