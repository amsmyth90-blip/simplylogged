"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import {
  RoomHotspotMarker,
  RoomSceneHeader,
  roomHotspotClass,
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
        <img
          src="/images/pages/bedroom-health-room-clean.png"
          alt="Interactive DiaryDock Bedroom"
          className="absolute inset-0 h-full w-full object-fill"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"
        />

        <Link
          href="/bedroom/health-profile"
          aria-label="Open Health Profile"
          className={`${roomHotspotClass} group left-[2%] top-[12%] h-[37%] w-[30%]`}
        >
          <RoomHotspotMarker
            label="Health Profile"
            className="left-[48%] top-[58%]"
            labelPosition="right"
          />
        </Link>
        <Link
          href="/bedroom/medical-records"
          aria-label="Open Medical Records"
          className={`${roomHotspotClass} group left-[29%] top-[39%] h-[31%] w-[45%]`}
        >
          <RoomHotspotMarker
            label="Medical Records"
            className="left-[25%] top-[45%]"
            labelPosition="below-left"
          />
        </Link>
        <Link
          href="/bedroom/medications"
          aria-label="Open Medications and Prescriptions"
          className={`${roomHotspotClass} group left-[75%] top-[26%] h-[36%] w-[24%]`}
        >
          <RoomHotspotMarker
            label="Medications"
            className="left-[47%] top-[43%]"
            labelPosition="left"
          />
        </Link>
        <Link
          href="/bedroom/appointments"
          aria-label="Open Health Appointments"
          className={`${roomHotspotClass} group left-[1%] top-[56%] h-[30%] w-[36%]`}
        >
          <RoomHotspotMarker
            label="Appointments"
            className="left-[49%] top-[47%]"
            labelPosition="right"
          />
        </Link>
        <Link
          href="/bedroom/emergency"
          aria-label="Open Emergency Medical Information"
          className={`${roomHotspotClass} group left-[56%] top-[61%] h-[25%] w-[40%]`}
        >
          <RoomHotspotMarker
            label="Emergency Info"
            className="left-[49%] top-[38%]"
            labelPosition="left"
          />
        </Link>
      </div>

      <RoomSceneHeader roomName="Bedroom" />
      <BottomNav />
    </div>
  );
}
