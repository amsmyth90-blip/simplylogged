import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { VehicleProfileWorkspace } from "@/components/garage/VehicleProfileWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicle Repairs" };
export default async function VehicleRepairsPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requireUser();
  const { vehicleId } = await params;
  return <><VehicleProfileWorkspace vehicleId={vehicleId} initialTab="repairs" /><BottomNav /></>;
}
