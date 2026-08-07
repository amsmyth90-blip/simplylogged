import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { VehicleReceiptsWorkspace } from "@/components/garage/VehicleReceiptsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicle Receipts" };

export default async function VehicleReceiptsPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requireUser();
  const { vehicleId } = await params;
  return <><VehicleReceiptsWorkspace vehicleId={vehicleId} /><BottomNav /></>;
}
