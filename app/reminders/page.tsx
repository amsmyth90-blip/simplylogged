import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { RemindersWorkspace } from "@/components/RemindersWorkspace";
import { requireUser } from "@/lib/auth";
import { remindersList } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  await requireUser();

  return (
    <>
      <RemindersWorkspace initialReminders={remindersList} />
      <BottomNav />
    </>
  );
}
