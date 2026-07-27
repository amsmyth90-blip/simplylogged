import type { Metadata } from "next";

import { EmergencyAccessWorkspace } from "@/components/EmergencyAccessWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Emergency Access" };

export default async function EmergencyAccessPage() {
  await requireUser();

  return <EmergencyAccessWorkspace />;
}
