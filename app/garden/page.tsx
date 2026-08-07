import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Garden" };

export default async function GardenPage() {
  await requireUser();
  redirect("/room/garden");
}
