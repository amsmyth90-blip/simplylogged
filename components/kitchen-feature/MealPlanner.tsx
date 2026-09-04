"use client";

import Link from "next/link";

import { BottomNav } from "@/components/BottomNav";
import { UiIcon } from "@/components/UiIcon";
import { MealPlannerDragPreview } from "@/components/kitchen-feature/MealPlannerDragPreview";
import { MealPlannerSheet } from "@/components/kitchen-feature/MealPlannerSheet";
import { MealPlannerShoppingSheet } from "@/components/kitchen-feature/MealPlannerShoppingSheet";
import { MealPlannerDiners, MealPlannerSummary } from "@/components/kitchen-feature/MealPlannerSummary";
import { MealPlannerTable, MealPlannerWeekNav } from "@/components/kitchen-feature/MealPlannerTable";
import { useMealPlannerController } from "@/components/kitchen-feature/useMealPlannerController";

export function MealPlanner() {
  const planner = useMealPlannerController();
  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.96),transparent_34%),linear-gradient(180deg,#edf3e9_0%,#fbfcf9_48%,#eef4eb_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center gap-3">
          <Link href="/room/kitchen" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen"><UiIcon name="arrow-left" className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Kitchen</p>
            <h1 className="text-xl font-semibold tracking-tight">Weekly meal planner</h1>
            <p className="mt-0.5 text-[10px] text-slate-500">Plan meals. Shop smart. Eat together.</p>
          </div>
          <button type="button" onClick={() => { planner.setShoppingMessage(""); planner.setShoppingOpen(true); }} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/90 bg-white/78 px-3 text-[9px] font-bold text-[#607b55] shadow-sm backdrop-blur-xl"><UiIcon name="plus" className="h-3.5 w-3.5" />Shop week</button>
        </header>
        <main className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2.5">
          <MealPlannerWeekNav planner={planner} />
          <MealPlannerTable planner={planner} />
          <MealPlannerSummary planner={planner} />
          <MealPlannerDiners planner={planner} />
        </main>
      </div>
      <MealPlannerSheet planner={planner} />
      <MealPlannerShoppingSheet planner={planner} />
      <MealPlannerDragPreview planner={planner} />
      <BottomNav />
    </div>
  );
}
