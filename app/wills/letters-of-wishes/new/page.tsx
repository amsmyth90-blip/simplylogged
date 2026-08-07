import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { LetterEditorWorkspace } from "@/components/wills/letters/LetterEditorWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New Letter of Wishes" };
export default async function NewLetterPage() { await requireUser(); return <><LetterEditorWorkspace /><BottomNav /></>; }
