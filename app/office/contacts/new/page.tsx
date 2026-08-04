import { BottomNav } from "@/components/BottomNav";
import { ProfessionalContactsWorkspace } from "@/components/contacts/ProfessionalContactsWorkspace";
import { requireUser } from "@/lib/auth";

export default async function NewProfessionalContactPage() {
  await requireUser();
  return (
    <>
      <ProfessionalContactsWorkspace view="new" />
      <BottomNav />
    </>
  );
}
