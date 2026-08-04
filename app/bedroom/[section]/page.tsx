import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BedroomSectionWorkspace } from "@/components/bedroom/BedroomSectionWorkspace";
import { requireUser } from "@/lib/auth";
import { bedroomSectionIds, type BedroomSectionId } from "@/lib/health-records";

export function generateStaticParams() {
  return bedroomSectionIds.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return { title: section.split("-").map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`).join(" ") };
}

export default async function BedroomSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ add?: string }> }) {
  await requireUser();
  const { section } = await params;
  if (!bedroomSectionIds.includes(section as BedroomSectionId)) notFound();
  const query = await searchParams;
  return <BedroomSectionWorkspace section={section as BedroomSectionId} initiallyAdding={query.add === "1"} />;
}
