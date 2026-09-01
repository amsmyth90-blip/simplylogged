import type { Metadata } from "next";

import { AnalyticsPrivacyWorkspace } from "@/components/AnalyticsPrivacyWorkspace";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Analytics Privacy" };

export default async function AnalyticsPrivacyPage() {
  await requireUser();
  return <><AnalyticsPrivacyWorkspace /><BottomNav /></>;
}

