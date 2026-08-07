import { BottomNav } from "@/components/BottomNav";
import { ProfessionalContactsWorkspace } from "@/components/contacts/ProfessionalContactsWorkspace";
import { requireUser } from "@/lib/auth";

export default async function ProfessionalContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  await requireUser();
  const { contactId } = await params;
  return (
    <>
      <ProfessionalContactsWorkspace view="detail" contactId={contactId} />
      <BottomNav />
    </>
  );
}
