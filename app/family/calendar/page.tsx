import type { Metadata } from "next";
import { KitchenFeatureWorkspace } from "@/components/KitchenFeatureWorkspace";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Family Calendar" };
export default async function FamilyCalendarPage() { await requireUser(); return <KitchenFeatureWorkspace feature="calendar" />; }
