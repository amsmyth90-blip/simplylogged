import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { LetterVersionsWorkspace } from "@/components/wills/letters/LetterVersionsWorkspace";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Letter Version History" };
export default async function VersionsPage({ params }: { params: Promise<{ letterId: string }> }) { await requireUser(); const { letterId } = await params; return <><LetterVersionsWorkspace letterId={letterId} /><BottomNav /></>; }
