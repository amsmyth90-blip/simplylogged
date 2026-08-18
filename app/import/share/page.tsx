import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { ShareImportWorkspace } from "@/components/ShareImportWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Share to DiaryDock" };

export default async function ShareImportPage() {
  await requireUser();

  return (
    <>
      <ShareImportWorkspace />
      <BottomNav />
    </>
  );
}
