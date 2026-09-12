"use client";

import Link from "next/link";

import { BottomNav } from "@/components/BottomNav";
import { UiIcon, type IconName } from "@/components/UiIcon";

export type DrivewayFeatureId =
  | "trips"
  | "travel-checklist"
  | "parking-permits";

const featureDetails: Record<
  DrivewayFeatureId,
  { title: string; description: string; icon: IconName }
> = {
  trips: {
    title: "My Trips",
    description: "Plan journeys and keep the practical details for each trip together.",
    icon: "map-pin",
  },
  "travel-checklist": {
    title: "Travel Checklist",
    description: "Prepare packing lists and departure checks without moving original identity documents out of the Office.",
    icon: "check",
  },
  "parking-permits": {
    title: "Parking & Permits",
    description: "Parking tools are not available yet. You can save parking documents in All Files.",
    icon: "car",
  },
};

export function DrivewayFeatureWorkspace({ feature }: { feature: DrivewayFeatureId }) {
  const details = featureDetails[feature];

  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-32 text-[#20352a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>

      <div className="desktop-workspace relative mx-auto w-full max-w-[680px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center gap-3">
          <Link
            href="/room/driveway"
            aria-label="Back to Driveway"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">Driveway</p>
            <h1 className="font-serif text-3xl leading-tight tracking-tight">{details.title}</h1>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#20352a]/[0.08] bg-white/82 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.45)] sm:p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dde6d8] text-[#52705a]">
            <UiIcon name={details.icon} className="h-5 w-5" />
          </span>
          <p className="mt-2 text-sm leading-6 text-[#667068]">{details.description}</p>

          <Link href="/files" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-4 text-sm font-semibold text-white">
            Open All Files
            <UiIcon name="chevron-right" className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
