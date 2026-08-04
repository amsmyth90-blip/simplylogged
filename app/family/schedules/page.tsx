import type { Metadata } from "next";

import { KidsSchedulesWorkspace } from "@/components/KidsSchedulesWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Household Schedules" };

export default async function HouseholdSchedulesPage() {
  await requireUser();
  return <KidsSchedulesWorkspace />;
}
