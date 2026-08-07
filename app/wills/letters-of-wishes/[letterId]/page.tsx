import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { LetterEditorWorkspace } from "@/components/wills/letters/LetterEditorWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Letter of Wishes" };
export default async function LetterPage({ params }: { params: Promise<{ letterId: string }> }) { await requireUser(); const { letterId } = await params; return <><LetterEditorWorkspace letterId={letterId} /><BottomNav /></>; }
