import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { VehicleProfileWorkspace } from "@/components/garage/VehicleProfileWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicle Notes" };
export default async function VehicleNotesPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requireUser();
  const { vehicleId } = await params;
  return <><VehicleProfileWorkspace vehicleId={vehicleId} initialTab="notes" /><BottomNav /></>;
}
