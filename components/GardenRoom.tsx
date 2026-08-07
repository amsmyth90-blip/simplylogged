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

type GardenHotspot = {
  href: string;
  label: string;
  title: string;
  className: string;
  markerClassName: string;
  labelPosition?: "below" | "below-left" | "left" | "right";
};

const gardenHotspots: GardenHotspot[] = [
  {
    href: "/garden/pets",
    label: "Pets",
    title: "Pets",
    className: "left-[2%] top-[30%] h-[58%] w-[42%]",
    markerClassName: "left-[58%] top-[54%]",
    labelPosition: "right",
  },
  {
    href: "/garden/outdoor-spaces",
    label: "Outdoor Spaces",
    title: "Outdoor Spaces",
    className: "left-[58%] top-[17%] h-[35%] w-[42%]",
    markerClassName: "left-[35%] top-[62%]",
    labelPosition: "left",
  },
  {
    href: "/garden/jobs",
    label: "Jobs & Maintenance",
    title: "Jobs & Maintenance",
    className: "left-[25%] top-[52%] h-[20%] w-[46%]",
    markerClassName: "left-[52%] top-[60%]",
    labelPosition: "below",
  },
  {
    href: "/garden/outbuildings",
    label: "Sheds & Outbuildings",
    title: "Sheds & Outbuildings",
    className: "left-[10%] top-[11%] h-[23%] w-[56%]",
    markerClassName: "left-[58%] top-[58%]",
    labelPosition: "below-left",
  },
  {
    href: "/garden/equipment",
    label: "Tools & Equipment",
    title: "Tools & Equipment",
    className: "left-[0%] top-[39%] h-[17%] w-[55%]",
    markerClassName: "left-[48%] top-[47%]",
    labelPosition: "right",
  },
  {
    href: "/garden/bins",
    label: "Bins & Collections",
    title: "Bins & Collections",
    className: "left-[66%] top-[42%] h-[18%] w-[34%]",
    markerClassName: "left-[34%] top-[49%]",
    labelPosition: "left",
  },
  {
    href: "/garden/projects",
    label: "Projects",
    title: "Garden Projects",
    className: "left-[60%] top-[52%] h-[20%] w-[38%]",
    markerClassName: "left-[38%] top-[54%]",
    labelPosition: "left",
  },
  {
    href: "/garden/boundaries",
    label: "Boundaries & Safety",
    title: "Boundaries & Safety",
    className: "left-[66%] top-[23%] h-[22%] w-[33%]",
    markerClassName: "left-[34%] top-[52%]",
    labelPosition: "left",
  },
];

export function GardenRoom() {
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
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-[#2f3626] overscroll-none"
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
      <div className="absolute left-1/2 top-1/2 h-[max(100svh,150vw)] w-[max(100vw,66.67svh)] -translate-x-1/2 -translate-y-1/2">
        <Image
          src="/images/pages/garden-command-centre-v2.webp"
          alt="Interactive DiaryDock Garden with a cat, dog, potting bench, tools, outdoor boxes and planning notebook"
          fill
          priority
          unoptimized
          sizes="(max-width: 544px) 100vw, 544px"
          className="object-fill"
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#1f261b]/55 via-[#1f261b]/16 to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#1f261b]/42 via-[#1f261b]/10 to-transparent"
        />

        <nav aria-label="Garden sections" className="absolute inset-0 z-20">
          {gardenHotspots.map((hotspot) => (
            <Link
              key={hotspot.href}
              href={hotspot.href}
              aria-label={`Open ${hotspot.title}`}
              title={hotspot.title}
              className={`${roomHotspotClass} group ${hotspot.className}`}
            >
              <RoomHotspotMarker
                label={hotspot.label}
                className={hotspot.markerClassName}
                labelPosition={hotspot.labelPosition}
              />
            </Link>
          ))}
        </nav>
      </div>

      <RoomSceneHeader roomName="Garden" />
      <BottomNav />
    </div>
  );
}
