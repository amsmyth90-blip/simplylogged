import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { LifeCheckWorkspace } from "@/components/LifeCheckWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Life Check" };

export default async function LifeCheckPage() {
  await requireUser();
  return (
    <>
      <LifeCheckWorkspace />
      <BottomNav />
    </>
  );
}
