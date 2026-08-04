import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { WillsLandingPage } from "@/components/WillsLandingPage";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Wills & Letters of Wishes" };

export default async function WillsPage() {
  await requireUser();

  return (
    <>
      <WillsLandingPage />
      <BottomNav />
    </>
  );
}
