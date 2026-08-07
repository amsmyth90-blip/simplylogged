import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { LetterPreviewWorkspace } from "@/components/wills/letters/LetterPreviewWorkspace";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Letter Envelope Preview" };
export default async function PreviewPage({ params }: { params: Promise<{ letterId: string }> }) { await requireUser(); const { letterId } = await params; return <><LetterPreviewWorkspace letterId={letterId} /><BottomNav /></>; }
