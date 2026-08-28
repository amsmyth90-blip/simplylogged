"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { BottomNav } from "@/components/BottomNav";
import { DesktopSpaceLanding } from "@/components/DesktopSpaceLanding";
import {
  RoomSceneHeader,
  roomHotspotClass,
  roomImageLabelClass,
} from "@/components/RoomSceneChrome";

type GardenHotspot = {
  href: string;
  label: string;
  title: string;
  className: string;
  labelClassName: string;
};

const gardenHotspots: GardenHotspot[] = [
  {
    href: "/garden/pets",
    label: "Pets",
    title: "Pets",
    className: "left-[2%] top-[26%] h-[54%] w-[38%]",
    labelClassName: "left-[42%] top-[22%]",
  },
  {
    href: "/garden/outdoor-spaces",
    label: "Outdoor Spaces",
    title: "Outdoor Spaces",
    className: "left-[48%] top-[16%] h-[40%] w-[50%]",
    labelClassName: "left-[50%] top-[64%]",
  },
  {
    href: "/garden/jobs",
    label: "Garden Jobs",
    title: "Garden Jobs",
    className: "left-[22%] top-[57%] h-[22%] w-[54%]",
    labelClassName: "left-[52%] top-[54%]",
  },
  {
    href: "/garden/tools-shed",
    label: "Tools & Shed",
    title: "Tools & Shed",
    className: "left-[0%] top-[36%] h-[22%] w-[54%]",
    labelClassName: "left-[45%] top-[68%]",
  },
  {
    href: "/garden/bins",
    label: "Bins & Collections",
    title: "Bins & Collections",
    className: "left-[66%] top-[39%] h-[24%] w-[34%]",
    labelClassName: "left-[35%] top-[72%]",
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
    <>
      <DesktopSpaceLanding
        title="Pets & garden"
        eyebrow="Outdoor life"
        description="Care for pets, outdoor spaces, seasonal jobs and everything that lives beyond the back door."
        image="/images/pages/garden-command-centre-v2.webp"
        imageAlt="A calm garden workspace with a cat and dog"
        imagePosition="center 48%"
        items={gardenHotspots.map((section, index) => ({
          label: section.label,
          description: (["Profiles, care and important dates", "Your garden and outdoor areas", "Seasonal tasks and maintenance", "Equipment and outbuildings", "Collection days and reminders"] as const)[index],
          href: section.href,
          icon: (["heart", "leaf", "check", "gear", "calendar"] as const)[index],
        }))}
      />
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-[#2f3626] overscroll-none lg:hidden"
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
              <span className={`absolute -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass} ${hotspot.labelClassName}`}>
                {hotspot.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <RoomSceneHeader roomName="Pets & Garden" />
    </div>
      <BottomNav />
    </>
  );
}
