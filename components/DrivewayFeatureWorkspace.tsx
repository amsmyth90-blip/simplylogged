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
  { title: string; description: string; icon: IconName; belongsHere: string[] }
> = {
  trips: {
    title: "My Trips",
    description: "Plan journeys and keep the practical details for each trip together.",
    icon: "map-pin",
    belongsHere: ["Itineraries", "Bookings", "Travel dates", "Trip notes"],
  },
  "travel-checklist": {
    title: "Travel Checklist",
    description: "Prepare packing lists and departure checks without moving original identity documents out of the Office.",
    icon: "check",
    belongsHere: ["Packing list", "Home checks", "Documents to take", "Before you leave"],
  },
  "parking-permits": {
    title: "Parking & Permits",
    description: "Organise visitor parking instructions, permits and access information.",
    icon: "car",
    belongsHere: ["Visitor parking", "Permit details", "Access codes", "Restrictions"],
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

      <div className="relative mx-auto w-full max-w-[680px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
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
          <h2 className="mt-5 font-serif text-2xl">A calm place to begin</h2>
          <p className="mt-2 text-sm leading-6 text-[#667068]">{details.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {details.belongsHere.map((item) => (
              <div key={item} className="flex min-h-14 items-center gap-2 rounded-2xl bg-[#f3f3ec] px-3 py-2.5 text-xs font-semibold text-[#3c5145]">
                <UiIcon name="check" className="h-4 w-4 shrink-0 text-[#6f8e72]" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-[#6f8e72]/35 bg-[#edf2e9]/70 px-4 py-5 text-center">
            <p className="text-sm font-semibold">Ready for the next design step</p>
            <p className="mt-1 text-xs leading-5 text-[#667068]">
              This section is connected from the Driveway. Its detailed tools and layout can now be designed without changing the room scene.
            </p>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
