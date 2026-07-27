import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { SearchWorkspace } from "@/components/SearchWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  await requireUser();

  return (
    <>
      <SearchWorkspace />
      <BottomNav />
    </>
  );
}
