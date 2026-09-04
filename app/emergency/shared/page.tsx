import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { ReceivedEmergencyAccessWorkspace } from "@/components/ReceivedEmergencyAccessWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Shared Emergency Access" };

export default async function SharedEmergencyAccessPage() {
  await requireUser();
  return <><ReceivedEmergencyAccessWorkspace /><BottomNav /></>;
}
