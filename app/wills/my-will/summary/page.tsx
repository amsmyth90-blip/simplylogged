import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { WillSummaryWorkspace } from "@/components/wills/WillSummaryWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Will Summary" };
export default async function WillSummaryPage() { await requireUser(); return <><WillSummaryWorkspace /><BottomNav /></>; }
