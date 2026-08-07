import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { VaultWorkspace } from "@/components/VaultWorkspace";
import { requireUser } from "@/lib/auth";
import { vaultDocuments } from "@/lib/mock-data";

export const metadata: Metadata = { title: "All Files" };

export default async function VaultPage() {
  await requireUser();

  return (
    <>
      <VaultWorkspace initialDocuments={vaultDocuments} />
      <BottomNav />
    </>
  );
}
