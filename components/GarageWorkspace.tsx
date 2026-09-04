"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { DesktopSpaceLanding } from "@/components/DesktopSpaceLanding";
import { RoomSceneHeader, roomHotspotClass, roomImageLabelClass } from "@/components/RoomSceneChrome";
import type { IconName } from "@/components/UiIcon";

type GarageSectionId =
  | "vehicle"
  | "mot-tax"
  | "insurance"
  | "service"
  | "receipts";

type GarageSection = {
  id: GarageSectionId;
  label: string;
  shortDescription: string;
  modalDescription: string;
  icon: IconName;
  href: string;
};

const garageSections: GarageSection[] = [
  {
    id: "vehicle",
    label: "Vehicle Profile",
    shortDescription: "Identity and ownership",
    modalDescription: "Registration, ownership and the key records for each vehicle.",
    icon: "car",
    href: "",
  },
  {
    id: "mot-tax",
    label: "MOT & Tax",
    shortDescription: "Tests and renewals",
    modalDescription: "Keep MOT records, vehicle tax information and renewal reminders together.",
    icon: "calendar",
    href: "/mot-tax",
  },
  {
    id: "insurance",
    label: "Insurance",
    shortDescription: "Motor and breakdown cover",
    modalDescription: "Motor insurance and breakdown cover only. Home policies stay in the Office.",
    icon: "shield",
    href: "/insurance",
  },
  {
    id: "service",
    label: "Service Records",
    shortDescription: "Maintenance and repairs",
    modalDescription: "Service history, maintenance work, repairs and garage paperwork.",
    icon: "gear",
    href: "/servicing",
  },
  {
    id: "receipts",
    label: "Receipts",
    shortDescription: "Vehicle costs and proof",
    modalDescription: "Receipts and invoices relating to your vehicles and their upkeep.",
    icon: "file",
    href: "/costs/receipts",
  },
];

export function GarageWorkspace() {
  const router = useRouter();
  const { state, hydrated } = useDiaryDockData();
  const touchStartX = useRef<number | null>(null);
  const primaryVehicleId = state.vehicles.vehicles[0]?.id;
  const visibleSections = !hydrated
    ? []
    : primaryVehicleId
      ? garageSections
      : [
          {
            id: "vehicle" as const,
            label: "Add your first vehicle",
            shortDescription: "Create a secure vehicle profile",
            modalDescription: "Start your Garage with the vehicle you use.",
            icon: "car" as const,
            href: "",
          },
        ];
  const sectionHref = (section: GarageSection) =>
    primaryVehicleId
      ? `/garage/vehicles/${primaryVehicleId}${section.href}`
      : "/garage/vehicles/new";

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
        title="Vehicles"
        eyebrow="Garage"
        description="Keep each vehicle’s identity, legal dates, insurance, maintenance and costs together."
        image="/images/pages/garage-folio-hero-v5.webp"
        imageAlt="A warm organised garage with a car and workbench"
        imagePosition="center 46%"
        items={visibleSections.map((section) => ({
          label: section.label,
          description: section.shortDescription,
          icon: section.icon,
          href: sectionHref(section),
        })).concat(primaryVehicleId ? [{
          label: "Add vehicle",
          description: "Create another vehicle profile",
          icon: "plus" as const,
          href: "/garage/vehicles/new",
        }] : [])}
      />
      <main
        className="fixed inset-0 z-30 overflow-hidden bg-[#4b4033] overscroll-none lg:hidden"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (distance > 72) router.push("/dashboard");
        }}
      >
        <Image
          src="/images/pages/garage-folio-hero-v5.webp"
          alt=""
          fill
          priority
          unoptimized
          aria-hidden="true"
          className="scale-110 object-cover opacity-45 blur-2xl"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#2f281f]/20" />

        <section
          aria-label="Interactive Garage"
          className="absolute left-1/2 top-1/2 h-[max(100svh,177.71vw)] w-[max(100vw,56.27svh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#514536] shadow-[0_0_70px_rgba(28,23,17,0.5)]"
        >
          <Image
            src="/images/pages/garage-folio-hero-v5.webp"
            alt="A warm home garage with a car, bicycle, workbench and organised storage"
            fill
            priority
            unoptimized
            className="object-cover object-center"
            sizes="(max-width: 544px) 100vw, 544px"
          />
          <div className="absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-[#221c16]/60 via-[#2b231c]/16 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[#211b15]/30 to-transparent" />

          <nav aria-label="Garage sections" className="absolute inset-0 z-20">
            {visibleSections.map((section, index) => {
              const sharedProps = {
                "aria-label": `Open ${section.label}: ${section.shortDescription}`,
                className: `${roomHotspotClass} group left-[51%] right-[10%] min-h-11 active:scale-[0.98] motion-reduce:transform-none`,
                style: { top: `${55.5 + index * 5.4}%`, height: "5.4%" },
              };

              return (
                <Link key={section.id} href={sectionHref(section)} {...sharedProps}>
                  <span className="sr-only">{section.label}: {section.shortDescription}</span>
                  <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
                    {section.label}
                  </span>
                </Link>
              );
            })}
            {primaryVehicleId ? (
              <Link
                href="/garage/vehicles/new"
                aria-label="Add another vehicle"
                className={`${roomHotspotClass} group left-[51%] right-[10%] min-h-11 active:scale-[0.98] motion-reduce:transform-none`}
                style={{ top: "82.5%", height: "5.4%" }}
              >
                <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
                  Add vehicle
                </span>
              </Link>
            ) : null}
          </nav>

        </section>
        <RoomSceneHeader roomName="Garage" />
      </main>
      <BottomNav />
    </>
  );
}
