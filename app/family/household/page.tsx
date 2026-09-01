import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { PeopleSharingWorkspace } from "@/components/PeopleSharingWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "People & Sharing" };

export default async function PeopleSharingPage() {
  await requireUser();
  return <><PeopleSharingWorkspace /><BottomNav /></>;
}
