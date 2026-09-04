import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { GuardianWorkspace } from "@/components/GuardianWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Guardian" };

export default async function GuardianPage() {
  await requireUser();
  return (
    <>
      <GuardianWorkspace />
      <BottomNav />
    </>
  );
}
