import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { SignOutPanel } from "@/components/SignOutPanel";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <SettingsWorkspace accountCreatedAt={user.created_at} accountEmail={user.email} />
      <SignOutPanel />
      <BottomNav />
    </>
  );
}
