import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { HomeHandoverWorkspace } from "@/components/HomeHandoverWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Home Handover" };

export default async function HomeHandoverPage() {
  await requireUser();
  return <><HomeHandoverWorkspace /><BottomNav /></>;
}

