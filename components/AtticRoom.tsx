"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { BottomNav } from "@/components/BottomNav";
import {
  RoomHotspotMarker,
  RoomSceneHeader,
  roomHotspotClass,
} from "@/components/RoomSceneChrome";

type AtticHotspot = {
  href: string;
  label: string;
  description: string;
  className: string;
  markerClassName: string;
  labelPosition?: "below" | "below-left" | "left" | "right";
};

const atticHotspots: AtticHotspot[] = [
  {
    href: "/attic/photo-albums",
    label: "Photo Albums",
    description: "Scanned photos, captions and family album notes",
    className: "left-[51%] top-[66%] h-[24%] w-[47%]",
    markerClassName: "left-[53%] top-[25%]",
    labelPosition: "below-left",
  },
  {
    href: "/attic/keepsakes",
    label: "Keepsakes",
    description: "Sentimental items and the stories behind them",
    className: "left-[4%] top-[55%] h-[23%] w-[46%]",
    markerClassName: "left-[76%] top-[43%]",
    labelPosition: "left",
  },
  {
    href: "/attic/family-history",
    label: "Family History",
    description: "Family stories, timelines and remembered details",
    className: "left-[57%] top-[17%] h-[33%] w-[40%]",
    markerClassName: "left-[31%] top-[54%]",
    labelPosition: "left",
  },
  {
    href: "/attic/letters-journals",
    label: "Letters & Journals",
    description: "Old letters, journals and handwritten memories",
    className: "left-[1%] top-[67%] h-[25%] w-[48%]",
    markerClassName: "left-[48%] top-[59%]",
    labelPosition: "right",
  },
  {
    href: "/attic/heirlooms",
    label: "Heirlooms",
    description: "Meaningful family items, provenance and location notes",
    className: "left-[28%] top-[33%] h-[25%] w-[39%]",
    markerClassName: "left-[55%] top-[55%]",
    labelPosition: "below",
  },
  {
    href: "/attic/memory-box",
    label: "Memory Box",
    description: "Voice notes, small memories and personal stories",
    className: "left-[51%] top-[49%] h-[19%] w-[42%]",
    markerClassName: "left-[52%] top-[56%]",
    labelPosition: "left",
  },
];

export function AtticRoom() {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <main
      className="fixed inset-0 z-30 overflow-hidden bg-[#3d372c] overscroll-none"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const distance =
          (event.changedTouches[0]?.clientX ?? touchStartX.current) -
          touchStartX.current;
        touchStartX.current = null;
        if (distance > 72) router.push("/dashboard");
      }}
    >
      <Image
        src="/images/pages/attic-memory-room-v1.webp"
        alt=""
        fill
        priority
        unoptimized
        aria-hidden="true"
        className="scale-110 object-cover opacity-40 blur-2xl"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#2d281f]/20" />

      <section
        aria-label="Interactive Attic"
        className="relative mx-auto h-full w-[min(100vw,56.3svh,34rem)] overflow-hidden bg-[#7b6a55] shadow-[0_0_70px_rgba(36,29,21,0.5)]"
      >
        <Image
          src="/images/pages/attic-memory-room-v1.webp"
          alt="Interactive DiaryDock Attic with photo albums, keepsake boxes, family history shelves, letters, heirlooms and a memory box"
          fill
          priority
          unoptimized
          className="object-fill"
          sizes="(max-width: 544px) 100vw, 544px"
        />
        <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#2d281f]/44 via-[#2d281f]/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#2d281f]/36 via-[#2d281f]/6 to-transparent" />

        <nav aria-label="Attic sections" className="absolute inset-0 z-20">
          {atticHotspots.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              aria-label={`Open ${section.label}: ${section.description}`}
              title={section.description}
              className={`${roomHotspotClass} group min-h-11 active:scale-[0.98] motion-reduce:transform-none ${section.className}`}
            >
              <span className="sr-only">
                {section.label}: {section.description}
              </span>
              <RoomHotspotMarker
                label={section.label}
                className={section.markerClassName}
                labelPosition={section.labelPosition}
              />
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-[5.8rem] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/80 bg-[#e5ecde]/90 px-3 py-1.5 text-[12px] font-medium text-[#284334] shadow-lg backdrop-blur-lg">
          Tap an object to open it
        </div>
      </section>

      <RoomSceneHeader roomName="Attic" />
      <BottomNav />
    </main>
  );
}
