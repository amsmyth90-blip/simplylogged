import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { WillPreparationWorkspace } from "@/components/wills/WillPreparationWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Will Preparation" };
export default async function WillPreparationPage() { await requireUser(); return <><WillPreparationWorkspace /><BottomNav /></>; }
