"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { estateAreas } from "@/lib/mock-data";

const roomSceneImages = [
  "/images/kitchen-command-centre.webp",
  "/images/office-interactive-v1.webp",
  "/images/family-fireside-clean.webp",
  "/images/pages/bedroom-health-room-clean.webp",
  "/images/pages/garage-folio-hero-v5.webp",
  "/images/designs/driveway/08-car-boot-departure.webp",
] as const;

const hitboxSize: Record<string, { width: string; height: string }> = {
  attic: { width: "30%", height: "11%" },
  bedroom: { width: "29%", height: "11%" },
  office: { width: "30%", height: "11%" },
  "family-room": { width: "29%", height: "12%" },
  kitchen: { width: "30%", height: "12%" },
  garage: { width: "20%", height: "12%" },
  mailbox: { width: "13%", height: "10%" },
  garden: { width: "32%", height: "16%" },
  driveway: { width: "25%", height: "17%" },
  "front-gate": { width: "27%", height: "14%" }
};

const guideColours: Record<string, string> = {
  attic: "border-amber-400 bg-amber-300/20 text-amber-950",
  bedroom: "border-sky-400 bg-sky-300/20 text-sky-950",
  office: "border-cyan-400 bg-cyan-300/20 text-cyan-950",
  "family-room": "border-emerald-400 bg-emerald-300/20 text-emerald-950",
  kitchen: "border-emerald-400 bg-emerald-300/20 text-emerald-950",
  garage: "border-slate-400 bg-slate-300/25 text-slate-950",
  mailbox: "border-violet-400 bg-violet-300/20 text-violet-950",
  garden: "border-lime-400 bg-lime-300/20 text-lime-950",
  driveway: "border-orange-400 bg-orange-300/20 text-orange-950",
  "front-gate": "border-fuchsia-400 bg-fuchsia-300/20 text-fuchsia-950"
};

function EstateHotspotMarker({
  label,
  top = "50%",
  left = "50%",
  labelPosition = "below",
}: {
  label: string;
  top?: string;
  left?: string;
  labelPosition?: "below" | "right";
}) {
  const labelPositionClass = labelPosition === "right"
    ? "left-[calc(100%+7px)] top-1/2 -translate-y-1/2"
    : "left-1/2 top-[calc(100%+6px)] -translate-x-1/2";

  return (
    <span
      className="pointer-events-none absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2"
      style={{ top, left }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center rounded-full border border-white/90 bg-white/78 shadow-[0_5px_16px_rgba(15,23,42,0.28)] backdrop-blur-xl transition duration-300 group-hover:scale-110 group-hover:bg-white/92 group-focus-visible:scale-110">
        <span className="absolute inset-[-4px] animate-pulse rounded-full border border-white/55" />
        <span className="h-2 w-2 rounded-full bg-[#6f8b62] shadow-[0_0_0_3px_rgba(255,255,255,0.7)]" />
      </span>
      <span className={`absolute whitespace-nowrap rounded-full border border-white/90 bg-[rgba(229,236,222,0.94)] px-3 py-1.5 text-[13px] font-semibold leading-none tracking-wide text-[#284334] shadow-[0_7px_18px_rgba(32,53,42,0.3)] backdrop-blur-md transition duration-300 group-hover:bg-[#f4f7ef] ${labelPositionClass}`}>
        {label}
      </span>
    </span>
  );
}

export function EstateDashboard() {
  const [showRoomGuides, setShowRoomGuides] = useState(false);

  useEffect(() => {
    setShowRoomGuides(new URLSearchParams(window.location.search).get("showRooms") === "1");

    const preloadTimer = window.setTimeout(() => {
      roomSceneImages.forEach((src) => {
        const image = new window.Image();
        image.decoding = "async";
        image.src = src;
      });
    }, 150);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="relative h-[100svh] w-full overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[max(100svh,177.86vw)] w-[max(100vw,56.22svh)] -translate-x-1/2 -translate-y-1/2">
          <Image
            src="/images/estate-dashboard-country.webp"
            alt="DiaryDock digital estate with a cutaway attic, office, family dog and travel luggage"
            fill
            priority
            unoptimized
            className="object-fill"
            sizes="100vw"
          />

          {showRoomGuides ? (
            <div
              className="pointer-events-none absolute inset-0 z-20 opacity-55"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(15,23,42,0.48) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.48) 1px, transparent 1px)",
                backgroundSize: "10% 10%"
              }}
            />
          ) : null}

          {estateAreas.map((area) => {
            const size = hitboxSize[area.id] ?? { width: "16%", height: "12%" };

            return (
              <Link
                key={area.id}
                href={area.href}
                className={`group absolute z-30 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                  showRoomGuides
                    ? `border-2 border-dashed shadow-[0_8px_24px_rgba(15,23,42,0.16)] backdrop-blur-[1px] ${
                        guideColours[area.id] ?? "border-white bg-white/20 text-slate-950"
                      }`
                    : "bg-transparent focus-visible:bg-white/10"
                }`}
                style={{
                  left: area.left,
                  top: area.top,
                  width: size.width,
                  height: size.height,
                  transform: "translate(-50%, -50%)"
                }}
                aria-label={`Open ${area.name}`}
                title={area.name}
              >
                {showRoomGuides ? (
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-bold shadow-sm">
                    {area.name}
                  </span>
                ) : (
                  <EstateHotspotMarker
                    label={area.name}
                    top={area.id === "front-gate" ? "28%" : area.id === "garden" ? "5%" : "50%"}
                    left={area.id === "garden" ? "90%" : "50%"}
                    labelPosition={area.id === "garden" ? "right" : "below"}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-32 bg-gradient-to-b from-white/45 via-white/16 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-36 bg-gradient-to-t from-white/30 via-white/5 to-transparent" />

        {showRoomGuides ? (
          <div className="pointer-events-none absolute inset-x-0 top-28 z-50 flex justify-center px-4">
            <p className="rounded-full border border-white/80 bg-slate-950/78 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-xl">
              Room boundary preview
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
