import type { MealPlannerController } from "@/components/kitchen-feature/useMealPlannerController";
import { getPlannedMeal } from "@/lib/meal-planner";

export function MealPlannerDragPreview({ planner }: { planner: MealPlannerController }) {
  if (!planner.dragPoint || planner.dragSourceDay === null) return null;
  const sourceMeal = getPlannedMeal(
    planner.state.mealPlan,
    planner.dates[planner.dragSourceDay],
    planner.dragSourceDay,
  );
  return (
    <div aria-hidden="true" className="pointer-events-none fixed z-[100] flex max-w-[150px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border border-white/95 bg-white/94 px-2.5 py-2 shadow-[0_16px_35px_rgba(24,39,31,0.3)] backdrop-blur-xl" style={{ left: planner.dragPoint.x, top: planner.dragPoint.y }}>
      <span className="h-8 w-8 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: "url('/images/weekly-meal-thumbnails.png')", backgroundSize: "100% 700%", backgroundPosition: `center ${((sourceMeal?.imageIndex ?? planner.dragSourceDay) / 6) * 100}%` }} />
      <span className="min-w-0">
        <span className="block text-[8px] font-bold uppercase tracking-wide text-[#718c65]">{planner.dates[planner.dragSourceDay].toLocaleDateString("en-GB", { weekday: "long" })}</span>
        <span className="block truncate text-[10px] font-semibold text-slate-800">{sourceMeal?.name ?? "Empty day"}</span>
      </span>
    </div>
  );
}
