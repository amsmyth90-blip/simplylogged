import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { DocumentDetailWorkspace } from "@/components/DocumentDetailWorkspace";
import { requireUser } from "@/lib/auth";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
};

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params }: DocumentPageProps) {
  await requireUser();

  const { documentId } = await params;

  return (
    <>
      <DocumentDetailWorkspace documentId={documentId} />
      <BottomNav />
    </>
  );
}
