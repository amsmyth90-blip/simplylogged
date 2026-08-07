import type { Metadata } from "next";

import { HouseholdProfilesWorkspace } from "@/components/HouseholdProfilesWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Household Profiles" };

export default async function HouseholdProfilesPage() {
  await requireUser();
  return <HouseholdProfilesWorkspace />;
}
