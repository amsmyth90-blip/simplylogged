import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { EmergencyAccessWorkspace } from "@/components/EmergencyAccessWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Emergency Access" };

export default async function EmergencyAccessPage() {
  await requireUser();

  return <><EmergencyAccessWorkspace /><BottomNav /></>;
}
