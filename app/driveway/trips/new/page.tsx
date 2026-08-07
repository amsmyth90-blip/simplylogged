import type { Metadata } from "next";

import { TripsWorkspace } from "@/components/driveway/TripsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create Trip" };

export default async function CreateTripPage() {
  await requireUser();
  return <TripsWorkspace createOnLoad />;
}
