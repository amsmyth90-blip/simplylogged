import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { VehicleServiceRecordsWorkspace } from "@/components/garage/VehicleServiceRecordsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Service Details" };

export default async function VehicleServiceDetailsPage({ params }: { params: Promise<{ vehicleId: string; serviceId: string }> }) {
  await requireUser();
  const { vehicleId, serviceId } = await params;
  return <><VehicleServiceRecordsWorkspace vehicleId={vehicleId} serviceId={serviceId} /><BottomNav /></>;
}
