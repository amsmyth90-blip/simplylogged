"use client";

import { UiIcon } from "@/components/UiIcon";
import { getMealKey } from "@/lib/meal-planner";

import { mealImageStyle } from "./kitchen-recipes-model";
import type { KitchenRecipesController } from "./useKitchenRecipesController";

type Props = { controller: KitchenRecipesController };

export function RecipeDialogs({ controller }: Props) {
  return (
    <>
      <ScanStatus controller={controller} />
      <CookingPrompt controller={controller} />
      <RecipeOptions controller={controller} />
      <PlannerDialog controller={controller} />
      <DeleteDialog controller={controller} />
    </>
  );
}

function ScanStatus({ controller }: Props) {
  const { scanState, scanMessage } = controller;
  if (scanState === "idle") return null;
  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#1b2a25]/30 p-6 backdrop-blur-md">
      <section className="w-full max-w-sm rounded-[30px] border border-white/90 bg-[#fffdf8] p-6 text-center shadow-2xl">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${scanState === "saved" ? "bg-[#dfead9] text-[#5e7a53]" : "bg-[#263b35] text-white"}`}>
          {scanState === "saved" ? <UiIcon name="check" className="h-7 w-7" /> : <UiIcon name="camera" className="h-7 w-7 animate-pulse" />}
        </span>
        <h2 className="mt-4 font-serif text-xl font-semibold">{scanState === "saved" ? "Recipe saved" : "Reading your recipe"}</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">{scanMessage}</p>
      </section>
    </div>
  );
}

function CookingPrompt({ controller }: Props) {
  const { cooking, setCooking, selected, state, cookingSteps, beginCooking } = controller;
  if (!cooking) return null;
  const progress = state.kitchenCookingProgress?.recipeId === selected.id
    ? state.kitchenCookingProgress
    : null;
  return (
    <div className="absolute inset-0 z-[70] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setCooking(false)} role="presentation">
      <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fffdf8] p-5 shadow-2xl backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label={`Cook ${selected.name}`} onClick={event => event.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="h-14 w-14 shrink-0 rounded-2xl bg-cover bg-center" style={mealImageStyle(selected.image)} />
          <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#718c65]">{progress ? "Continue cooking" : "Ready to cook"}</p><h2 className="mt-1 truncate font-serif text-xl font-semibold">{selected.name}</h2></div>
          <button type="button" onClick={() => setCooking(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close">x</button>
        </div>
        <div className="mt-4 rounded-2xl bg-[#edf4e9] px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#718c65]">{cookingSteps.length} guided steps</span>
            <span className="flex items-center gap-1 text-[9px] font-semibold text-[#52684a]"><UiIcon name="clock" className="h-3 w-3" />{selected.time}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#52684a]">{selected.instructions}</p>
        </div>
        <button type="button" onClick={beginCooking} className="mt-3 h-11 w-full rounded-2xl bg-[#263b35] text-sm font-semibold text-white">{progress ? `Resume step ${progress.stepIndex + 1}` : "Begin recipe"}</button>
      </section>
    </div>
  );
}

function RecipeOptions({ controller }: Props) {
  const {
    recipeOptionsOpen, setRecipeOptionsOpen, selected, toggleFavourite, openRecipeEditor,
    setDeleteConfirmOpen, recipes
  } = controller;
  if (!recipeOptionsOpen) return null;
  return (
    <div className="absolute inset-0 z-[75] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setRecipeOptionsOpen(false)} role="presentation">
      <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Recipe options" onClick={event => event.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="h-14 w-14 rounded-2xl bg-cover bg-center" style={mealImageStyle(selected.image)} />
          <div className="min-w-0 flex-1"><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">Recipe options</p><h2 className="mt-1 truncate font-serif text-xl font-semibold">{selected.name}</h2></div>
          <button type="button" onClick={() => setRecipeOptionsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close recipe options">x</button>
        </div>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={toggleFavourite} className="flex h-12 items-center gap-3 rounded-2xl bg-[#edf4e9] px-4 text-left text-xs font-semibold text-[#52684a]"><UiIcon name="star" className="h-4 w-4" />{selected.favourite ? "Remove from favourites" : "Add to favourites"}</button>
          <button type="button" onClick={openRecipeEditor} className="flex h-12 items-center gap-3 rounded-2xl bg-slate-100 px-4 text-left text-xs font-semibold text-slate-700"><UiIcon name="file" className="h-4 w-4" />Edit recipe</button>
          <button type="button" onClick={() => { setRecipeOptionsOpen(false); setDeleteConfirmOpen(true); }} disabled={recipes.length <= 1} className="flex h-12 items-center gap-3 rounded-2xl bg-[#fff0ee] px-4 text-left text-xs font-semibold text-[#a4483d] disabled:opacity-40"><UiIcon name="archive" className="h-4 w-4" />Delete recipe</button>
        </div>
      </section>
    </div>
  );
}

function PlannerDialog({ controller }: Props) {
  const {
    plannerOpen, setPlannerOpen, selected, servings, planningDates, state,
    addRecipeToPlanner, plannedMessage, returnToRecipeDirectory
  } = controller;
  if (!plannerOpen) return null;
  return (
    <div className="absolute inset-0 z-[78] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setPlannerOpen(false)} role="presentation">
      <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Add recipe to a day" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">Weekly meal planner</p><h2 className="mt-1 font-serif text-xl font-semibold">Choose a day</h2></div>
          <button type="button" onClick={() => setPlannerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close meal planner">x</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{selected.name} · {servings} servings</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {planningDates.map((date, dayIndex) => {
            const planned = state.mealPlan[getMealKey(date)];
            return (
              <button key={getMealKey(date)} type="button" onClick={() => addRecipeToPlanner(date, dayIndex)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-[#718c65]">{date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric" })}</span>
                <span className="mt-1 block truncate text-[10px] font-medium text-slate-500">{planned?.name ?? "No saved meal"}</span>
              </button>
            );
          })}
        </div>
        {plannedMessage ? (
          <div className="mt-3 rounded-2xl bg-[#e7f0e2] p-3 text-center">
            <p className="text-[10px] font-semibold text-[#58704f]">{plannedMessage}</p>
            <button type="button" onClick={returnToRecipeDirectory} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#263b35] text-[10px] font-semibold text-white"><UiIcon name="arrow-left" className="h-3.5 w-3.5" />Back to recipe search</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DeleteDialog({ controller }: Props) {
  const { deleteConfirmOpen, setDeleteConfirmOpen, selected, deleteSelectedRecipe } = controller;
  if (!deleteConfirmOpen) return null;
  return (
    <div className="absolute inset-0 z-[85] flex items-center justify-center bg-[#17211d]/30 p-5 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-[28px] border border-white bg-[#fffdf8] p-5 text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-label="Delete recipe">
        <h2 className="font-serif text-xl font-semibold">Delete this recipe?</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">{selected.name} will be removed from your saved recipes.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="h-11 rounded-2xl bg-slate-100 text-xs font-semibold text-slate-600">Keep recipe</button>
          <button type="button" onClick={deleteSelectedRecipe} className="h-11 rounded-2xl bg-[#a4483d] text-xs font-semibold text-white">Delete</button>
        </div>
      </section>
    </div>
  );
}
