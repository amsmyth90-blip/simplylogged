import Image from "next/image";

import { UiIcon } from "@/components/UiIcon";
import { dayPositions, platePositions } from "@/components/kitchen-feature/kitchen-feature-model";
import type { MealPlannerController } from "@/components/kitchen-feature/useMealPlannerController";
import { getMealKey, getPlannedMeal } from "@/lib/meal-planner";

export function MealPlannerWeekNav({ planner }: { planner: MealPlannerController }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between rounded-full border border-white/90 bg-white/72 px-2 shadow-sm backdrop-blur-xl">
      <button type="button" onClick={() => planner.changeWeek(-1)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600" aria-label="Previous week"><UiIcon name="arrow-left" className="h-3.5 w-3.5" /></button>
      <span className="text-[10px] font-semibold text-slate-700">{planner.weekLabel}</span>
      <button type="button" onClick={() => planner.changeWeek(1)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600" aria-label="Next week"><UiIcon name="chevron-right" className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export function MealPlannerTable({ planner }: { planner: MealPlannerController }) {
  return (
    <section className="relative min-h-[225px] flex-1 overflow-hidden rounded-[28px] border border-white/90 bg-[#f7f8f3] shadow-[0_18px_42px_-30px_rgba(35,54,43,0.5)]">
      <Image
        src="/images/meal-planner-family-table.png"
        alt=""
        width={900}
        height={900}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[55%] h-[106%] w-[66%] -translate-x-1/2 -translate-y-1/2 object-contain mix-blend-multiply"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 46% 52% at center, #000 58%, rgba(0,0,0,.92) 70%, transparent 94%)",
          maskImage: "radial-gradient(ellipse 46% 52% at center, #000 58%, rgba(0,0,0,.92) 70%, transparent 94%)",
        }}
      />
      {planner.selectedMeal ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-[8] h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cover bg-center shadow-[0_5px_14px_rgba(44,52,35,0.22)] transition-all duration-300"
          style={{
            ...platePositions[planner.selectedDay],
            backgroundImage: "url('/images/weekly-meal-thumbnails.png')",
            backgroundSize: "100% 700%",
            backgroundPosition: `center ${(planner.selectedMeal.imageIndex / 6) * 100}%`,
          }}
        />
      ) : null}
      {planner.dates.map((date, index) => {
        const dateMeal = getPlannedMeal(planner.state.mealPlan, date, index);
        const dragging = planner.dragSourceDay === index;
        const targeted = planner.dragTargetDay === index && planner.dragSourceDay !== null;
        const selected = planner.selectedDay === index;
        const tone = dragging
          ? "z-30 scale-95 border-[#617c55] bg-white/60 opacity-45 shadow-none"
          : targeted
            ? "scale-110 animate-pulse border-[#617c55] ring-2 ring-[#91aa85]/50"
            : selected
              ? "border-[#88a277] bg-[#f2f7ef]/95"
              : index % 2 ? "border-[#ead9bd] bg-[#fffaf0]/92" : "border-[#dbe5ef] bg-white/92";
        return (
          <button
            key={getMealKey(date)}
            type="button"
            data-meal-day={index}
            onClick={() => { if (!planner.suppressClickRef.current) planner.setSelectedDay(index); }}
            onPointerDown={(event) => planner.beginDrag(index, event)}
            onPointerMove={planner.continueDrag}
            onPointerUp={planner.finishDrag}
            onPointerCancel={planner.finishDrag}
            className={`absolute z-10 w-[86px] touch-none cursor-grab select-none rounded-[14px] border px-2 py-1.5 text-left shadow-[0_8px_18px_-12px_rgba(15,23,42,0.5)] backdrop-blur-xl transition duration-150 active:cursor-grabbing ${dayPositions[index]} ${tone}`}
            aria-label={`${date.toLocaleDateString("en-GB", { weekday: "short" })} ${date.getDate()} ${dateMeal?.name ?? "Add meal"}. Press and drag to swap.`}
          >
            <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">{date.toLocaleDateString("en-GB", { weekday: "short" })}<span className="text-slate-800">{date.getDate()}</span></span>
            <span className={`mt-0.5 block line-clamp-2 text-[9px] font-semibold leading-[12px] ${dateMeal ? "text-slate-800" : "text-slate-400"}`}>{dateMeal?.name ?? "Add meal"}</span>
          </button>
        );
      })}
    </section>
  );
}
