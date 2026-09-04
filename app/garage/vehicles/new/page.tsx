import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { NewVehicleWorkspace } from "@/components/garage/NewVehicleWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add a Vehicle" };

export default async function NewVehiclePage() {
  await requireUser();
  return (
    <>
      <NewVehicleWorkspace />
      <BottomNav />
    </>
  );
}
