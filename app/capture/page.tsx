import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { DocumentCaptureWorkspace } from "@/components/DocumentCaptureWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add document" };

export default async function CapturePage() {
  await requireUser();

  return (
    <>
      <DocumentCaptureWorkspace />
      <BottomNav />
    </>
  );
}
