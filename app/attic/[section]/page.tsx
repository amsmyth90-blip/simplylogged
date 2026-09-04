import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { AtticSectionWorkspace } from "@/components/attic/AtticSectionWorkspace";
import { requireUser } from "@/lib/auth";
import {
  atticSections,
  getAtticSection,
  isAtticSection,
  type AtticSection,
} from "@/lib/attic-sections";

type AtticSectionPageProps = { params: Promise<{ section: string }> };

export function generateStaticParams() {
  return atticSections.map((section: AtticSection) => ({ section: section.id }));
}

export async function generateMetadata({ params }: AtticSectionPageProps): Promise<Metadata> {
  const { section } = await params;
  if (section === "heirlooms") return { title: "Keepsakes & Heirlooms" };
  return { title: isAtticSection(section) ? getAtticSection(section).title : "Attic" };
}

export default async function AtticSectionPage({ params }: AtticSectionPageProps) {
  await requireUser();
  const { section } = await params;
  if (section === "heirlooms") redirect("/attic/keepsakes");
  if (!isAtticSection(section)) notFound();

  return (
    <>
      <AtticSectionWorkspace section={getAtticSection(section)} />
      <BottomNav />
    </>
  );
}
