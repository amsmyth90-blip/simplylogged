"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { RoomHotspotMarker, RoomSceneHeader, roomHotspotClass } from "@/components/RoomSceneChrome";
import { getPlannedMeal, getWeekDates } from "@/lib/meal-planner";

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
    <span className="flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-white bg-white/96 p-1.5 text-slate-900 shadow-[0_8px_20px_rgba(48,43,32,0.24)] backdrop-blur-2xl">
      <span className="mb-1 block whitespace-nowrap text-center text-[9px] font-bold uppercase tracking-[0.05em] text-[#657a57]">
        {today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </span>
      <span className="grid shrink-0 grid-cols-7 gap-px text-center text-[7px] font-bold leading-none text-slate-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </span>
      <span className="mt-1 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px text-center text-[8px] font-semibold leading-none">
        {cells.map((date, index) => (
          <span key={index} className={`flex min-h-0 min-w-0 items-center justify-center ${date === today.getDate() ? "rounded-full bg-[#799267] text-white" : "text-slate-800"}`}>
            {date ?? ""}
          </span>
        ))}
      </span>
      <span className="mt-1 block shrink-0 rounded-full bg-[#657a57] px-2 py-0.5 text-center text-[8px] font-semibold text-white shadow-sm">
        Open calendar
      </span>
    </span>
  );
}

export function KitchenRoom() {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const { state } = useDiaryDockData();
  const weekDates = getWeekDates();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const tonightMeal = getPlannedMeal(state.mealPlan, weekDates[todayIndex], todayIndex);
  const tonightRecipe = tonightMeal
    ? state.kitchenRecipes.find(recipe => recipe.id === tonightMeal.recipeId)
      ?? state.kitchenRecipes.find(recipe => {
        const mealName = tonightMeal.name.toLowerCase();
        const recipeName = recipe.name.toLowerCase();
        return mealName === recipeName || mealName.includes(recipeName) || recipeName.includes(mealName);
      })
    : undefined;
  const recipeHref = tonightRecipe
    ? `/kitchen/recipes?recipe=${encodeURIComponent(tonightRecipe.id)}&cook=1`
    : "/kitchen/recipes";

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
        <Image
          src="/images/kitchen-coastal-cottage.webp"
          alt="Interactive DiaryDock Kitchen"
          fill
          priority
          unoptimized
          sizes="(max-width: 544px) 100vw, 544px"
          className="object-fill"
        />

        <Link href="/kitchen/calendar" aria-label="Open the Kitchen wall calendar" title="Kitchen wall calendar" className={`${roomHotspotClass} group left-[29.7%] top-[17.7%] h-[19%] w-[35%]`}>
          <MiniCalendar />
        </Link>
        <Link href="/kitchen/meal-planner" aria-label="Open weekly meal planner" title="Weekly meal planner" className={`${roomHotspotClass} group left-[68%] top-[20%] h-[38%] w-[32%]`}>
          <span className="pointer-events-none absolute left-[20%] top-[17%] flex h-[46%] w-[69%] flex-col overflow-hidden rounded-[3px] border border-slate-700/25 bg-[#fbfaf6] p-[3px] shadow-[inset_0_0_12px_rgba(15,23,42,0.08)]">
            <span className="mb-[2px] block shrink-0 text-center text-[clamp(5px,1.25vw,7px)] font-bold uppercase tracking-[0.12em] text-[#627653]">
              This week
            </span>
            <span className="grid min-h-0 flex-1 grid-rows-7 gap-px">
              {weekDates.map((date, index) => {
                const meal = getPlannedMeal(state.mealPlan, date, index);
                const imageIndex = meal?.imageIndex ?? index;
                return (
                <span key={date.toISOString()} className="grid min-h-0 grid-cols-[27%_1fr] items-center gap-[3px] overflow-hidden rounded-[2px] bg-white/85 pr-[2px]">
                  <span
                    className="block h-full min-h-0 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: "url('/images/weekly-meal-thumbnails.png')",
                      backgroundSize: "100% 700%",
                      backgroundPosition: `center ${(imageIndex / 6) * 100}%`
                    }}
                  />
                  <span className="min-w-0 leading-none">
                    <span className="block text-[clamp(3.5px,0.85vw,5px)] font-bold uppercase tracking-wide text-[#7b8b70]">
                      {date.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span className="mt-px block truncate text-[clamp(4px,1vw,6px)] font-semibold text-slate-800">{meal?.name ?? "Not planned"}</span>
                  </span>
                </span>
                );
              })}
            </span>
          </span>
          <RoomHotspotMarker label="Meal planner" className="left-[16%] top-[76%]" labelPosition="left" />
        </Link>
        <Link href="/kitchen/pantry" aria-label="Open pantry and shopping list" title="Pantry and shopping" className={`${roomHotspotClass} group left-[8%] top-[17%] h-[42%] w-[21%]`}>
          <RoomHotspotMarker label="Pantry" className="left-[55%] top-[25%]" labelPosition="right" />
        </Link>
        <Link href="/kitchen/notes" aria-label="Open family noticeboard" title="Family notes" className={`${roomHotspotClass} group left-[30.8%] top-[38.3%] h-[12.5%] w-[31.4%]`}>
          <RoomHotspotMarker label="Noticeboard" className="left-[45%] top-[45%]" labelPosition="right" />
        </Link>
        <Link href={recipeHref} aria-label={tonightRecipe ? `Cook tonight's ${tonightRecipe.name}` : "Open family recipes"} title={tonightRecipe ? `Tonight: ${tonightRecipe.name}` : "Family recipes"} className={`${roomHotspotClass} group left-[44%] top-[53.5%] h-[9%] w-[42%]`}>
          <RoomHotspotMarker label={tonightRecipe ? "Cook tonight" : "Recipes"} className="left-[50%] top-[50%]" labelPosition="left" />
        </Link>
        <Link href="/kitchen/documents" aria-label="Open Kitchen documents" title="Kitchen documents" className={`${roomHotspotClass} group left-[69%] top-[63.5%] h-[22%] w-[31%]`}>
          <RoomHotspotMarker label="Documents" className="left-[28%] top-[45%]" labelPosition="left" />
        </Link>

      </div>

      <RoomSceneHeader roomName="Kitchen" />

      <BottomNav />
    </div>
  );
}
