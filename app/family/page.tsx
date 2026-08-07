import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { FamilyWorkspace } from "@/components/FamilyWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Family Room" };

export default async function FamilyPage() {
  await requireUser();

  return (
    <>
      <FamilyWorkspace />
      <BottomNav />
    </>
  );
}
