import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { BillsWorkspace } from "@/components/bills/BillsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage() {
  await requireUser();
  return <><BillsWorkspace view="dashboard" /><BottomNav /></>;
}
