import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { LettersDashboard } from "@/components/wills/letters/LettersDashboard";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Letters of Wishes" };

export default async function LettersOfWishesPage() {
  await requireUser();

  return (
    <>
      <LettersDashboard />
      <BottomNav />
    </>
  );
}
