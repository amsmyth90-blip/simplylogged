import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  TripDetailWorkspace,
  type TripSection,
} from "@/components/driveway/TripDetailWorkspace";
import { requireUser } from "@/lib/auth";

type TripPageProps = {
  params: Promise<{ tripId: string; section?: string[] }>;
};

const validSections: TripSection[] = [
  "overview",
  "itinerary",
  "bookings",
  "documents",
  "checklist",
  "travellers",
  "insurance",
  "expenses",
  "emergency",
  "settings",
];

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({ params }: TripPageProps) {
  await requireUser();
  const { tripId, section: segments } = await params;
  if (segments && segments.length > 1) notFound();
  const section = (segments?.[0] ?? "overview") as TripSection;
  if (!validSections.includes(section)) notFound();
  return <TripDetailWorkspace tripId={tripId} section={section} />;
}
