import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Family Calendar" };

export default async function FamilyCalendarPage() {
  await requireUser();
  redirect("/kitchen/calendar");
}
