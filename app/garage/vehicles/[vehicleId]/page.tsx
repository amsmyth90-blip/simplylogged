import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { VehicleProfileWorkspace } from "@/components/garage/VehicleProfileWorkspace";
import { requireUser } from "@/lib/auth";

type VehicleProfilePageProps = {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const metadata: Metadata = { title: "Vehicle Profile" };

const vehicleTabs = ["overview", "servicing", "costs", "documents", "notes"] as const;

export default async function VehicleProfilePage({ params, searchParams }: VehicleProfilePageProps) {
  await requireUser();
  const [{ vehicleId }, { tab }] = await Promise.all([params, searchParams]);
  const initialTab = vehicleTabs.find((item) => item === tab) ?? "overview";

  return (
    <>
      <VehicleProfileWorkspace vehicleId={vehicleId} initialTab={initialTab} />
      <BottomNav />
    </>
  );
}
