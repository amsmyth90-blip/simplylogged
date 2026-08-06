import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { FamilyStoryBuilderWorkspace } from "@/components/attic/FamilyStoryBuilderWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create a family story" };

export default async function NewFamilyStoryPage() {
  await requireUser();

  return (
    <>
      <FamilyStoryBuilderWorkspace />
      <BottomNav />
    </>
  );
}
