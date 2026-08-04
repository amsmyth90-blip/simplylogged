import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { WillDetailsWorkspace } from "@/components/wills/WillDetailsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Will Details" };
export default async function WillDetailsPage() { await requireUser(); return <><WillDetailsWorkspace /><BottomNav /></>; }
