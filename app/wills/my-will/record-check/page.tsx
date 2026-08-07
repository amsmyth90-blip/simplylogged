import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { WillRecordCheckWorkspace } from "@/components/wills/WillRecordCheckWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Will Record Check" };
export default async function WillRecordCheckPage() { await requireUser(); return <><WillRecordCheckWorkspace /><BottomNav /></>; }
