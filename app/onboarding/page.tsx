import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { OnboardingWorkspace } from "@/components/OnboardingWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Setup" };

export default async function OnboardingPage() {
  await requireUser();

  return (
    <>
      <OnboardingWorkspace />
      <BottomNav />
    </>
  );
}
