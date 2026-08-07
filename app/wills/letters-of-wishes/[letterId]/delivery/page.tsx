import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { LetterDeliveryWorkspace } from "@/components/wills/letters/LetterDeliveryWorkspace";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Letter Delivery Preferences" };
export default async function DeliveryPage({ params }: { params: Promise<{ letterId: string }> }) { await requireUser(); const { letterId } = await params; return <><LetterDeliveryWorkspace letterId={letterId} /><BottomNav /></>; }
