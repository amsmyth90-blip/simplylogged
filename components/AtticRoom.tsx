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

type AtticHotspot = {
  href: string;
  label: string;
  description: string;
  className: string;
  labelClassName: string;
};

const atticHotspots: AtticHotspot[] = [
  {
    href: "/attic/photo-albums",
    label: "Photo Albums",
    description: "Scanned photos, captions and family album notes",
    className: "left-[2%] top-[70%] h-[17%] w-[41%]",
    labelClassName: "left-[50%] top-[42%]",
  },
  {
    href: "/attic/keepsakes",
    label: "Keepsakes & Heirlooms",
    description: "Meaningful items, their stories and where they are kept",
    className: "left-[26%] top-[34%] h-[25%] w-[33%]",
    labelClassName: "left-[50%] top-[48%]",
  },
  {
    href: "/attic/family-history",
    label: "Family History",
    description: "Family stories, timelines and remembered details",
    className: "left-[59%] top-[16%] h-[31%] w-[38%]",
    labelClassName: "left-[52%] top-[46%]",
  },
  {
    href: "/attic/letters-journals",
    label: "Letters & Journals",
    description: "Old letters, journals and handwritten memories",
    className: "left-[3%] top-[52%] h-[18%] w-[34%]",
    labelClassName: "left-[50%] top-[60%]",
  },
  {
    href: "/attic/memory-box",
    label: "Memory Box",
    description: "Voice notes, small memories and personal stories",
    className: "left-[64%] top-[61%] h-[23%] w-[34%]",
    labelClassName: "left-[46%] top-[50%]",
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
    <>
      <DesktopSpaceLanding
        title="Memories"
        eyebrow="Attic"
        description="Preserve family photographs, stories, meaningful objects and the memories attached to them."
        image="/images/pages/attic-memory-room-v1.webp"
        imageAlt="A warm attic filled with albums, keepsakes and family memories"
        items={atticHotspots.map((section, index) => ({
          label: section.label,
          description: section.description,
          href: section.href,
          icon: (["camera", "archive", "users", "file", "heart"] as const)[index],
        }))}
      />
    <main
      className="fixed inset-0 z-30 overflow-hidden bg-[#3d372c] overscroll-none lg:hidden"
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
              <span
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass} ${section.labelClassName}`}
              >
                {section.label}
              </span>
            </Link>
          ))}
        </nav>

      </section>

      <RoomSceneHeader roomName="Attic" />
    </main>
      <BottomNav />
    </>
  );
}
