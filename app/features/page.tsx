import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { WebFeatureDirectory } from "@/components/WebFeatureDirectory";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "All features" };
export default async function FeaturesPage() {
  await requireUser();
  return <>
    <section className="pb-28 pt-5 lg:pb-10">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#486a50]">‹ Back to your home</Link>
      <header className="mb-8 mt-4">
        <h1 className="text-4xl font-semibold tracking-tight text-[#20352a]">Your whole DiaryDock</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#667068]">Open a space or jump straight to the task you need. Your saved account information is shared with the mobile app after it syncs.</p>
      </header>
      <WebFeatureDirectory />
    </section>
    <BottomNav />
  </>;
}
