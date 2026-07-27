import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { IntakeWorkspace } from "@/components/IntakeWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Intake Queue" };

export default async function IntakePage() {
  await requireUser();

  return (
    <>
      <IntakeWorkspace />
      <BottomNav />
    </>
  );
}
