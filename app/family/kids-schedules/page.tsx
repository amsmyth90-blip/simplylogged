import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Weekly Schedules" };

export default async function KidsSchedulesPage() {
  await requireUser();
  redirect("/family/schedules");
}
