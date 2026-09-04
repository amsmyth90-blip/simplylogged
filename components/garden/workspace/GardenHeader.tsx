import Image from "next/image";
import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import type { GardenViewModel } from "./useGardenWorkspace";

export function GardenHeader({ view }: { view: GardenViewModel }) {
  return (
    <header className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-white/80 bg-[#304534] shadow-[0_30px_70px_-42px_rgba(25,44,33,0.78)] sm:min-h-[560px]">
      <Image
        src="/images/pages/garden-command-centre-v2.webp"
        alt="A leafy Garden workspace with a cat, a dog and an open planning notebook"
        fill
        priority
        sizes="(max-width: 760px) 100vw, 760px"
        className="object-cover object-center"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/65"
      />
      <div className="relative z-10 flex min-h-[520px] flex-col p-4 text-white sm:min-h-[560px] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to Home"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/20 shadow-lg backdrop-blur-xl transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>
          <span className="rounded-full border border-white/50 bg-white/20 px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-xl">
            Pets & Garden
          </span>
          <div className="flex gap-2">
            <Link
              href="/search"
              aria-label="Search DiaryDock"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/20 shadow-lg backdrop-blur-xl transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UiIcon name="search" className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => view.setAddOpen(true)}
              aria-label="Add to Garden"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/20 shadow-lg backdrop-blur-xl transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UiIcon name="plus" className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-auto max-w-[560px] rounded-[24px] border border-white/30 bg-[#20352a]/45 p-4 shadow-xl backdrop-blur-md sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-white/75">
            Outdoor life
          </p>
          <h1 className="mt-2 font-serif text-[38px] leading-none tracking-[-0.04em] sm:text-5xl">
            Everything beyond the back door
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/90">
            Keep pets, outdoor spaces, jobs and everything beyond the back door
            organised in one place.
          </p>
        </div>
      </div>
    </header>
  );
}
