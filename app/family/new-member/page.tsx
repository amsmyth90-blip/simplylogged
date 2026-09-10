import type { Metadata } from "next";

import { AddHouseholdPersonForm } from "@/components/family/AddHouseholdPersonForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add someone" };

export default async function NewHouseholdPersonPage() {
  await requireUser();
  return <AddHouseholdPersonForm />;
}
