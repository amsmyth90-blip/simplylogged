import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { GardenSectionPlaceholder } from "@/components/garden/GardenSectionPlaceholder";
import { requireUser } from "@/lib/auth";
import { gardenSections, getGardenSection, isGardenSection } from "@/lib/garden-sections";

type GardenSectionPageProps = { params: Promise<{ section: string }> };

export function generateStaticParams() {
  return gardenSections.map((section) => ({ section: section.id }));
}

export async function generateMetadata({ params }: GardenSectionPageProps): Promise<Metadata> {
  const { section } = await params;
  return { title: isGardenSection(section) ? getGardenSection(section).title : "Garden" };
}

export default async function GardenSectionPage({ params }: GardenSectionPageProps) {
  await requireUser();
  const { section } = await params;
  if (!isGardenSection(section)) notFound();

  return (
    <>
      <GardenSectionPlaceholder section={getGardenSection(section)} />
      <BottomNav />
    </>
  );
}
