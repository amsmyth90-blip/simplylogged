import type { Metadata } from "next";

import { TripsWorkspace } from "@/components/driveway/TripsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Trips" };

export default async function MyTripsPage() {
  await requireUser();
  return <TripsWorkspace />;
}
