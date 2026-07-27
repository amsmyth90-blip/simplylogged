import type { Metadata } from "next";

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
      <SignOutPanel />
      <BottomNav />
    </>
  );
}
