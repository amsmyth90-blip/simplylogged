import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { GardenWorkspace } from "@/components/garden/GardenWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Garden" };

export default async function GardenPage() {
  await requireUser();

  return (
    <>
      <GardenWorkspace />
      <BottomNav />
    </>
  );
}
