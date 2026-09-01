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

const drivewaySections = [
  {
    label: "My Trips",
    description: "Journeys, bookings and travel plans",
    href: "/driveway/trips",
    className: "left-[4%] top-[51%] h-[26%] w-[42%]",
    labelClassName: "left-[63%] top-[52%]",
  },
  {
    label: "Travel Checklist",
    description: "Packing lists and departure checks",
    href: "/driveway/travel-checklist",
    className: "left-[49%] top-[59%] h-[22%] w-[49%]",
    labelClassName: "left-[52%] top-[48%]",
  },
  {
    label: "Parking & Permits",
    description: "Visitor parking and access permits",
    href: "/driveway/parking-permits",
    className: "left-[63%] top-[46%] h-[13%] w-[15%]",
    labelClassName: "left-[44%] top-[50%]",
  },
] as const;

export function DrivewayWorkspace() {
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
        title="Plans & travel"
        eyebrow="Driveway"
        description="Keep trips, packing lists, parking and travel details ready for the moment you leave home."
        image="/images/designs/driveway/08-car-boot-departure.webp"
        imageAlt="A country driveway with a packed car and travel cases"
        imagePosition="center 58%"
        items={drivewaySections.map((section, index) => ({
          label: section.label,
          description: section.description,
          href: section.href,
          icon: (["map-pin", "check", "car"] as const)[index],
        }))}
      />
    <main
      className="fixed inset-0 z-30 overflow-hidden bg-[#594b3b] overscroll-none lg:hidden"
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
        src="/images/designs/driveway/08-car-boot-departure.webp"
        alt=""
        fill
        priority
        unoptimized
        aria-hidden="true"
        className="scale-110 object-cover opacity-40 blur-2xl"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#372e24]/20" />

      <section
        aria-label="Interactive Driveway"
        className="absolute left-1/2 top-1/2 h-[max(100svh,177.71vw)] w-[max(100vw,56.27svh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#8f775d] shadow-[0_0_70px_rgba(36,29,21,0.5)]"
      >
        <Image
          src="/images/designs/driveway/08-car-boot-departure.webp"
          alt="A warm country driveway prepared for a journey, with an open car boot, travel cases, visitor keys, parking permit and a parcel bench"
          fill
          priority
          unoptimized
          className="object-cover object-center"
          sizes="(max-width: 544px) 100vw, 544px"
        />
        <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#2b241d]/46 via-[#2b241d]/8 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#2b241d]/34 via-[#2b241d]/5 to-transparent" />

        <nav aria-label="Driveway sections" className="absolute inset-0 z-20">
          {drivewaySections.map((section) => (
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
              <span className={`absolute -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass} ${section.labelClassName}`}>
                {section.label}
              </span>
            </Link>
          ))}
        </nav>

      </section>

      <RoomSceneHeader roomName="Driveway" />
    </main>
      <BottomNav />
    </>
  );
}
