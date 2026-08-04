import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DrivewayFeatureWorkspace,
  type DrivewayFeatureId,
} from "@/components/DrivewayFeatureWorkspace";
import { TripsWorkspace } from "@/components/driveway/TripsWorkspace";
import { TravelChecklistWorkspace } from "@/components/driveway/TravelChecklistWorkspace";
import { requireUser } from "@/lib/auth";

const drivewayFeatureIds = [
  "trips",
  "travel-checklist",
  "parking-permits",
] as const;

type DrivewayFeaturePageProps = {
  params: Promise<{ feature: string }>;
  searchParams: Promise<{ trip?: string }>;
};

export function generateStaticParams() {
  return drivewayFeatureIds.map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: DrivewayFeaturePageProps): Promise<Metadata> {
  const { feature } = await params;
  return {
    title:
      feature === "trips"
        ? "My Trips"
        : feature
            .split("-")
            .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
            .join(" "),
  };
}

export default async function DrivewayFeaturePage({ params, searchParams }: DrivewayFeaturePageProps) {
  await requireUser();
  const { feature } = await params;
  if (!drivewayFeatureIds.includes(feature as DrivewayFeatureId)) notFound();
  if (feature === "trips") return <TripsWorkspace />;
  if (feature === "travel-checklist") {
    const { trip } = await searchParams;
    return (
      <TravelChecklistWorkspace
        initialTripId={trip}
        backHref={trip ? `/driveway/trips/${trip}/checklist` : "/room/driveway"}
      />
    );
  }
  return <DrivewayFeatureWorkspace feature={feature as DrivewayFeatureId} />;
}
