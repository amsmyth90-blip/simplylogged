"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
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
  const weekCount = Math.ceil((firstDay + daysInMonth) / 7);
  const cells = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = index - firstDay + 1;
    return date > 0 && date <= daysInMonth ? date : null;
  });

  return (
    <span className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-white bg-white/96 p-2 text-slate-900 shadow-[0_12px_30px_rgba(48,43,32,0.28)] backdrop-blur-2xl">
      <span className="mb-1 block whitespace-nowrap text-center text-[clamp(8px,2vw,10px)] font-bold uppercase tracking-[0.08em] text-[#657a57]">
        {today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </span>
      <span className="grid grid-cols-7 text-center text-[clamp(6px,1.4vw,7px)] font-bold text-slate-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </span>
      <span className="mt-0.5 grid flex-1 grid-cols-7 content-center gap-y-0.5 text-center text-[clamp(6.5px,1.55vw,8px)] font-semibold leading-none">
        {cells.map((date, index) => (
          <span key={index} className={`flex h-[clamp(10px,1.9vw,14px)] items-center justify-center ${date === today.getDate() ? "rounded-full bg-[#799267] text-white" : "text-slate-800"}`}>
            {date ?? ""}
          </span>
        ))}
      </span>
      <span className="mt-1 block shrink-0 rounded-full bg-[#657a57] px-2 py-0.5 text-center text-[clamp(7px,1.55vw,8px)] font-semibold text-white shadow-sm">
        Open calendar
      </span>
    </span>
  );
}

export function KitchenRoom() {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const { state } = useLifeDockData();
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
          src="/images/kitchen-command-centre.webp"
          alt="Interactive DiaryDock Kitchen"
          fill
          priority
          unoptimized
          sizes="(max-width: 544px) 100vw, 544px"
          className="object-fill"
        />

        <span
          aria-hidden="true"
          className="absolute left-[51%] top-[23.5%] z-10 h-[20%] w-[24%] rounded-2xl bg-[#d7d0c5] shadow-[0_8px_20px_rgba(71,62,50,0.08)]"
        />
        <Link href="/kitchen/calendar" aria-label="Open the Kitchen wall calendar" title="Kitchen wall calendar" className={`${roomHotspotClass} group left-[53.5%] top-[24.5%] h-[19%] w-[20%]`}>
          <MiniCalendar />
        </Link>
        <Link href="/kitchen/meal-planner" aria-label="Open weekly meal planner" title="Weekly meal planner" className={`${roomHotspotClass} group left-0 top-[23%] h-[36%] w-[24%]`}>
          <span className="pointer-events-none absolute left-[43%] top-[18%] flex h-[38%] w-[54%] flex-col overflow-hidden rounded-[3px] border border-slate-700/25 bg-[#fbfaf6] p-[3px] shadow-[inset_0_0_12px_rgba(15,23,42,0.08)]">
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
          <RoomHotspotMarker label="Meal planner" className="left-[70%] top-[49%]" labelPosition="right" />
        </Link>
        <Link href="/kitchen/pantry" aria-label="Open pantry and shopping list" title="Pantry and shopping" className={`${roomHotspotClass} group left-[76%] top-[18%] h-[43%] w-[10%]`}>
          <RoomHotspotMarker label="Pantry" className="left-[55%] top-[30%]" />
        </Link>
        <Link href="/kitchen/notes" aria-label="Open family noticeboard" title="Family notes" className={`${roomHotspotClass} group left-[82%] top-[21%] h-[39%] w-[18%]`}>
          <RoomHotspotMarker label="Noticeboard" className="left-[28%] top-[55%]" labelPosition="left" />
        </Link>
        <Link href={recipeHref} aria-label={tonightRecipe ? `Cook tonight's ${tonightRecipe.name}` : "Open family recipes"} title={tonightRecipe ? `Tonight: ${tonightRecipe.name}` : "Family recipes"} className={`${roomHotspotClass} group left-[28%] top-[48%] h-[14%] w-[42%]`}>
          <RoomHotspotMarker label={tonightRecipe ? "Cook tonight" : "Recipes"} className="left-[50%] top-[52%]" />
        </Link>
        <Link href="/kitchen/documents" aria-label="Open Kitchen documents" title="Kitchen documents" className={`${roomHotspotClass} group left-[18%] top-[62%] h-[16%] w-[49%]`}>
          <RoomHotspotMarker label="Documents" className="left-[52%] top-[58%]" />
        </Link>

      </div>

      <RoomSceneHeader roomName="Kitchen" />

      <BottomNav />
    </div>
  );
}
