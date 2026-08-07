import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { VehicleReceiptsWorkspace } from "@/components/garage/VehicleReceiptsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add Vehicle Receipt" };

export default async function AddVehicleReceiptPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requireUser();
  const { vehicleId } = await params;
  return <><VehicleReceiptsWorkspace vehicleId={vehicleId} mode="new" /><BottomNav /></>;
}
