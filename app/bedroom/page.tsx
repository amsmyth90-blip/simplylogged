import type { Metadata } from "next";

import { BedroomHealthWorkspace } from "@/components/bedroom/BedroomHealthWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Health" };

export default async function BedroomHealthPage() {
  await requireUser();
  return <BedroomHealthWorkspace />;
}
