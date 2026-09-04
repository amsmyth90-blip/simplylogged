import type { Metadata } from "next";

import { AskDiaryDockWorkspace } from "@/components/AskDiaryDockWorkspace";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Ask DiaryDock" };

export default async function AskDiaryDockPage() {
  await requireUser();
  return <><AskDiaryDockWorkspace /><BottomNav /></>;
}
