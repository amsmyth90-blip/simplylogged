import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { VehicleReceiptsWorkspace } from "@/components/garage/VehicleReceiptsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Receipt Details" };

export default async function VehicleReceiptDetailsPage({ params }: { params: Promise<{ vehicleId: string; receiptId: string }> }) {
  await requireUser();
  const { vehicleId, receiptId } = await params;
  return <><VehicleReceiptsWorkspace vehicleId={vehicleId} mode="detail" receiptId={receiptId} /><BottomNav /></>;
}
