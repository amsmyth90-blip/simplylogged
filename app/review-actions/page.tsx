import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { CaptureProposalsWorkspace } from "@/components/CaptureProposalsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Suggested next steps" };

export default async function ReviewActionsPage() {
  await requireUser();
  return (
    <>
      <CaptureProposalsWorkspace />
      <BottomNav />
    </>
  );
}
