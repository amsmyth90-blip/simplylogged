import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { WillsSectionPlaceholder } from "@/components/WillsSectionPlaceholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Wishes & Preferences" };

export default async function WishesPreferencesPage() {
  await requireUser();

  return (
    <>
      <WillsSectionPlaceholder
        title="My Wishes & Preferences"
        description="An organisational area for recording medical, ethical and personal preferences in your own words."
        icon="leaf"
      />
      <BottomNav />
    </>
  );
}
