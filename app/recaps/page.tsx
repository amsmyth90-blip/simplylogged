import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { WebRecaps } from "@/components/recaps/WebRecaps";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Your recaps" };
export default async function RecapsPage() {
  await requireUser();
  return <><main className="px-4 pt-5 pb-28 sm:px-6 lg:pb-6">
    <div className="mx-auto mb-4 max-w-[1200px]"><Link href="/dashboard">← Home</Link></div>
    <WebRecaps />
  </main><BottomNav /></>;
}
