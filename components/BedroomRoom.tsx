"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import {
  RoomSceneHeader,
  roomHotspotClass,
  roomImageLabelClass,
} from "@/components/RoomSceneChrome";

export function BedroomRoom() {
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
      className="fixed inset-0 z-30 overflow-hidden bg-[#3d4030] overscroll-none"
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
      <div className="absolute left-1/2 top-1/2 h-[max(100svh,177.71vw)] w-[max(100vw,56.27svh)] -translate-x-1/2 -translate-y-1/2">
        <Image
          src="/images/pages/bedroom-health-room-clean.webp"
          alt="Interactive DiaryDock Bedroom"
          fill
          priority
          unoptimized
          sizes="(max-width: 544px) 100vw, 544px"
          className="object-fill"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"
        />

        <Link
          href="/bedroom/health-profile"
          aria-label="Open My Health"
          className={`${roomHotspotClass} group left-[2%] top-[12%] h-[37%] w-[30%]`}
        >
          <span className={`absolute left-[92%] top-[58%] -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
            My Health
          </span>
        </Link>
        <Link
          href="/bedroom/medical-records"
          aria-label="Open Health Documents"
          className={`${roomHotspotClass} group left-[29%] top-[39%] h-[31%] w-[45%]`}
        >
          <span className={`absolute left-[33%] top-[55%] -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
            Health Documents
          </span>
        </Link>
        <Link
          href="/bedroom/medications"
          aria-label="Open Medications and Prescriptions"
          className={`${roomHotspotClass} group left-[75%] top-[26%] h-[36%] w-[24%]`}
        >
          <span className={`absolute left-[-10%] top-[43%] -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
            Medications
          </span>
        </Link>
        <Link
          href="/bedroom/appointments"
          aria-label="Open Health Appointments"
          className={`${roomHotspotClass} group left-[1%] top-[56%] h-[30%] w-[36%]`}
        >
          <span className={`absolute left-[75%] top-[47%] -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
            Appointments
          </span>
        </Link>
        <Link
          href="/bedroom/emergency"
          aria-label="Open Emergency Medical Information"
          className={`${roomHotspotClass} group left-[56%] top-[61%] h-[25%] w-[40%]`}
        >
          <span className={`absolute left-[35%] top-[50%] -translate-x-1/2 -translate-y-1/2 ${roomImageLabelClass}`}>
            Emergency Info
          </span>
        </Link>
      </div>

      <RoomSceneHeader roomName="Bedroom" />
      <BottomNav />
    </div>
  );
}
