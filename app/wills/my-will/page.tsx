import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { MyWillDashboard } from "@/components/wills/MyWillDashboard";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Will" };

export default async function MyWillPage() {
  await requireUser();

  return (
    <>
      <MyWillDashboard />
      <BottomNav />
    </>
  );
}
