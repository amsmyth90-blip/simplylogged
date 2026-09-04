import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { WishesPreferencesWorkspace } from "@/components/wills/preferences/WishesPreferencesWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Wishes & Preferences" };

export default async function WishesPreferencesPage() {
  await requireUser();

  return (
    <>
      <WishesPreferencesWorkspace />
      <BottomNav />
    </>
  );
}
