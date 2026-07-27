"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { UiIcon } from "@/components/UiIcon";

function MiniCalendar() {
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  if (!today) return <span className="block h-full w-full rounded-2xl bg-white/80" />;

  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = index - firstDay + 1;
    return date > 0 && date <= daysInMonth ? date : null;
  });

  return (
    <span className="block h-full w-full rounded-2xl border border-white bg-white/96 p-2.5 text-slate-900 shadow-[0_12px_30px_rgba(48,43,32,0.28)] backdrop-blur-2xl">
      <span className="mb-1.5 block text-center text-[clamp(9px,2.5vw,12px)] font-bold uppercase tracking-[0.12em] text-[#657a57]">
        {today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </span>
      <span className="grid grid-cols-7 text-center text-[clamp(6px,1.65vw,8px)] font-bold text-slate-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </span>
      <span className="mt-1 grid grid-cols-7 gap-y-1 text-center text-[clamp(7px,1.8vw,9px)] font-semibold leading-none">
        {cells.map((date, index) => (
          <span key={index} className={`flex h-[clamp(14px,2.4vw,22px)] items-center justify-center ${date === today.getDate() ? "rounded-full bg-[#799267] text-white" : "text-slate-800"}`}>
            {date ?? ""}
          </span>
        ))}
      </span>
      <span className="mt-1.5 block rounded-full bg-[#657a57] px-2 py-1 text-center text-[clamp(7px,1.8vw,9px)] font-semibold text-white shadow-sm">
        Open calendar
      </span>
    </span>
  );
}

const hotspotClass = "absolute z-20 rounded-2xl bg-transparent transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90";

function HotspotMarker({
  label,
  className = "left-1/2 top-1/2",
  labelPosition = "below"
}: {
  label: string;
  className?: string;
  labelPosition?: "below" | "below-left" | "left" | "right";
}) {
  const labelPositionClass =
    labelPosition === "left"
      ? "right-[calc(100%+4px)] top-1/2 -translate-y-1/2"
      : labelPosition === "right"
        ? "left-[calc(100%+4px)] top-1/2 -translate-y-1/2"
        : labelPosition === "below-left"
          ? "right-0 top-[calc(100%+4px)]"
          : "left-1/2 top-[calc(100%+4px)] -translate-x-1/2";

  return (
    <span className={`pointer-events-none absolute z-30 h-7 w-7 -translate-x-1/2 -translate-y-1/2 ${className}`}>
      <span className="absolute inset-0 flex items-center justify-center rounded-full border border-white/90 bg-white/72 shadow-[0_5px_18px_rgba(15,23,42,0.28)] backdrop-blur-xl transition duration-300 group-hover:scale-110 group-hover:bg-white/90 group-focus-visible:scale-110">
        <span className="absolute inset-[-5px] animate-pulse rounded-full border border-white/55" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6f8b62] shadow-[0_0_0_3px_rgba(255,255,255,0.72)]" />
      </span>
      <span className={`absolute whitespace-nowrap rounded-full border border-white/65 bg-slate-950/64 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white shadow-md backdrop-blur-md transition duration-300 group-hover:bg-slate-950/82 ${labelPositionClass}`}>
        {label}
      </span>
    </span>
  );
}

export function KitchenRoom() {
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
      className="fixed inset-0 z-30 overflow-hidden bg-[#1d251c] overscroll-none"
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
      <div className="absolute left-1/2 top-1/2 h-[max(100svh,177.86vw)] w-[max(100vw,56.22svh)] -translate-x-1/2 -translate-y-1/2">
        <img src="/images/kitchen-command-centre.png" alt="Interactive LifeDock Kitchen" className="absolute inset-0 h-full w-full object-fill" />

        <Link href="/family/calendar" aria-label="Open shared family calendar" title="Family calendar" className={`${hotspotClass} group left-[51%] top-[24%] h-[20%] w-[24%]`}>
          <MiniCalendar />
        </Link>
        <Link href="/kitchen/meal-planner" aria-label="Open weekly meal planner" title="Weekly meal planner" className={`${hotspotClass} group left-0 top-[23%] h-[36%] w-[24%]`}>
          <HotspotMarker label="Meal planner" className="left-[70%] top-[49%]" labelPosition="right" />
        </Link>
        <Link href="/kitchen/pantry" aria-label="Open pantry and shopping list" title="Pantry and shopping" className={`${hotspotClass} group left-[73%] top-[23%] h-[39%] w-[17%]`}>
          <HotspotMarker label="Pantry" className="left-[50%] top-[48%]" labelPosition="left" />
        </Link>
        <Link href="/kitchen/notes" aria-label="Open family noticeboard" title="Family notes" className={`${hotspotClass} group left-[85%] top-[32%] h-[22%] w-[15%]`}>
          <HotspotMarker label="Noticeboard" className="left-[42%] top-[54%]" labelPosition="left" />
        </Link>
        <Link href="/kitchen/recipes" aria-label="Open family recipes" title="Family recipes" className={`${hotspotClass} group left-[28%] top-[48%] h-[14%] w-[42%]`}>
          <HotspotMarker label="Recipes" className="left-[50%] top-[52%]" />
        </Link>
        <Link href="/kitchen/documents" aria-label="Open Kitchen documents" title="Kitchen documents" className={`${hotspotClass} group left-[18%] top-[62%] h-[16%] w-[49%]`}>
          <HotspotMarker label="Documents" className="left-[52%] top-[58%]" />
        </Link>

      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <Link
          href="/dashboard"
          aria-label="Return to Home"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/60 text-slate-800 shadow-lg backdrop-blur-xl"
        >
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <div className="rounded-full border border-white/55 bg-white/60 px-4 py-2 text-center shadow-lg backdrop-blur-xl">
          <p className="text-sm font-semibold tracking-tight text-slate-900">Kitchen</p>
        </div>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <BottomNav />
    </div>
  );
}
