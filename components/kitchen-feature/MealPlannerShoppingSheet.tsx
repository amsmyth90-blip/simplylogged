import { UiIcon } from "@/components/UiIcon";
import type { MealPlannerController } from "@/components/kitchen-feature/useMealPlannerController";
import { normaliseRecipeIngredient } from "@/lib/kitchen-recipes";

export function MealPlannerShoppingSheet({ planner }: { planner: MealPlannerController }) {
  if (!planner.shoppingOpen) return null;
  return (
    <div className="absolute inset-0 z-[70] flex items-end bg-slate-950/20 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" role="presentation" onClick={() => planner.setShoppingOpen(false)}>
      <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/98 p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label="Weekly shopping list" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">Pantry checked</p>
            <h2 className="mt-1 text-lg font-semibold">Shopping for the week</h2>
            <p className="mt-1 text-[10px] text-slate-500">{planner.weeklyMissingIngredients.length} missing ingredient{planner.weeklyMissingIngredients.length === 1 ? "" : "s"} across linked recipes.</p>
          </div>
          <button type="button" onClick={() => planner.setShoppingOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close weekly shopping">x</button>
        </div>
        <div className="mt-4 grid max-h-[42svh] grid-cols-2 gap-2 overflow-y-auto">
          {planner.weeklyMissingIngredients.map((ingredient) => <span key={normaliseRecipeIngredient(ingredient)} className="truncate rounded-2xl bg-[#edf4e9] px-3 py-2.5 text-[10px] font-medium text-[#52684a]">{ingredient}</span>)}
          {!planner.weeklyMissingIngredients.length ? <p className="col-span-2 rounded-2xl bg-[#edf4e9] px-3 py-5 text-center text-xs text-[#607b55]">Everything is already in your pantry.</p> : null}
        </div>
        <button type="button" onClick={planner.addWeekToShopping} disabled={!planner.weeklyMissingIngredients.length} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#263b35] text-xs font-semibold text-white disabled:opacity-40"><UiIcon name="plus" className="h-4 w-4" />Add missing items</button>
        {planner.shoppingMessage ? <p className="mt-2 text-center text-[10px] font-semibold text-[#607b55]">{planner.shoppingMessage}</p> : null}
      </section>
    </div>
  );
}
