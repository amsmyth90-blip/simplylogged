import type { Metadata } from "next";
import Link from "next/link";

import { BottomNav } from "@/components/BottomNav";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { SignOutPanel } from "@/components/SignOutPanel";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();

  return (
    <>
      <SettingsWorkspace />
      <Link href="/subscription" className="my-4 rounded-2xl border border-[#20352a]/15 bg-[#fffdf8] p-5 font-semibold text-[#20352a] underline underline-offset-4">
        Plans &amp; storage
      </Link>
      <Link href="/features" className="mb-4 inline-flex min-h-11 items-center font-semibold text-[#486a50] underline underline-offset-4">Browse all features</Link>
      <SignOutPanel />
      <BottomNav />
    </>
  );
}
