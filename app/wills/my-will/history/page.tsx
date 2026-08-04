import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { WillHistoryWorkspace } from "@/components/wills/WillHistoryWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Will Version History" };
export default async function WillHistoryPage() { await requireUser(); return <><WillHistoryWorkspace /><BottomNav /></>; }
