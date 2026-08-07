import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitchenFeatureWorkspace } from "@/components/KitchenFeatureWorkspace";
import { requireUser } from "@/lib/auth";

const features = ["calendar", "meal-planner", "pantry", "recipes", "notes", "documents"] as const;
type Feature = (typeof features)[number];

export function generateStaticParams() { return features.map(feature => ({ feature })); }
export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }): Promise<Metadata> {
  const { feature } = await params;
  return { title: feature.split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ") };
}
export default async function KitchenFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  await requireUser();
  const { feature } = await params;
  if (!features.includes(feature as Feature)) notFound();
  return <KitchenFeatureWorkspace feature={feature as Feature} />;
}
