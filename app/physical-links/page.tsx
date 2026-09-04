import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { PhysicalLinksWorkspace } from "@/components/PhysicalLinksWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Physical Links" };

export default async function PhysicalLinksPage() {
  await requireUser();
  return <><PhysicalLinksWorkspace /><BottomNav /></>;
}
