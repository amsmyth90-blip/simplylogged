import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { EmergencyWorkspace } from "@/components/EmergencyWorkspace";
import { requireUser } from "@/lib/auth";
import { emergencyContacts, emergencyPlans, homeInfo } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Emergency" };

export default async function EmergencyPage() {
  await requireUser();

  return (
    <>
      <EmergencyWorkspace
        initialContacts={emergencyContacts}
        initialPlans={emergencyPlans}
        initialHomeInfo={homeInfo}
      />
      <BottomNav />
    </>
  );
}
