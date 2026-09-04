"use client";

import { UiIcon } from "@/components/UiIcon";

import { mealImageStyle } from "./kitchen-recipes-model";
import type { KitchenRecipesController } from "./useKitchenRecipesController";

type Props = { controller: KitchenRecipesController };

export function RecipeCookingMode({ controller }: Props) {
  const {
    cookingMode, setCookingMode, selected, showCookingIngredients, setShowCookingIngredients,
    cookingSteps, cookingStep, setCookingServings, servings, activeCookingStep,
    moveToCookingStep, finishRecipe
  } = controller;
  if (!cookingMode) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.98),transparent_35%),linear-gradient(180deg,#edf4e9_0%,#faf9f5_52%,#f1eee6_100%)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3">
          <button type="button" onClick={() => setCookingMode(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-sm" aria-label="Exit cooking mode">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#718c65]">Cooking now</p>
            <h1 className="truncate font-serif text-[19px] font-semibold leading-5">{selected.name}</h1>
          </div>
          <button type="button" onClick={() => setShowCookingIngredients(current => !current)} className="rounded-full border border-white bg-white px-3 py-2 text-[9px] font-bold text-[#607b55] shadow-sm" aria-expanded={showCookingIngredients}>Ingredients</button>
        </header>

        <div className="mt-3 flex shrink-0 gap-1">
          {cookingSteps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full transition-colors ${index <= cookingStep ? "bg-[#708d64]" : "bg-white"}`} />)}
        </div>

        <main className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[30px] border border-white bg-[#fffdf8] shadow-[0_25px_60px_-35px_rgba(32,48,39,0.55)] backdrop-blur-xl">
            <div className="h-[34%] bg-cover bg-center" style={mealImageStyle(selected.image)} role="img" aria-label={selected.name} />
            <div className="flex h-[66%] flex-col p-5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#718c65]">Step {cookingStep + 1} of {Math.max(cookingSteps.length, 1)}</p>
                <div className="flex items-center gap-1 rounded-full bg-[#edf3e9] p-1">
                  <button type="button" onClick={() => setCookingServings(servings - 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#607b55]" aria-label="Decrease servings">−</button>
                  <span className="min-w-12 text-center text-[9px] font-bold text-[#607b55]">{servings} servings</span>
                  <button type="button" onClick={() => setCookingServings(servings + 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#607b55]" aria-label="Increase servings">+</button>
                </div>
              </div>
              <h2 className="mt-2 font-serif text-[clamp(20px,6vw,26px)] font-semibold leading-tight text-[#202838]">{activeCookingStep?.title || "Follow the recipe"}</h2>
              {activeCookingStep?.durationMinutes || activeCookingStep?.temperature ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeCookingStep.durationMinutes ? <span className="flex items-center gap-1.5 rounded-full bg-[#e8f0e4] px-3 py-1.5 text-[10px] font-bold text-[#58704f]"><UiIcon name="clock" className="h-3.5 w-3.5" />{activeCookingStep.durationMinutes} min</span> : null}
                  {activeCookingStep.temperature ? <span className="rounded-full bg-[#f4e9dd] px-3 py-1.5 text-[10px] font-bold text-[#855f3f]">{activeCookingStep.temperature}</span> : null}
                </div>
              ) : null}
              <p className="mt-3 text-[clamp(14px,4vw,17px)] font-medium leading-[1.45] text-[#354052]">{activeCookingStep?.instruction || selected.instructions}</p>
              {activeCookingStep?.tip ? (
                <p className="mt-auto rounded-2xl bg-[#fff7df] px-3 py-2 text-[10px] leading-4 text-[#775f32]"><span className="font-bold">Helpful tip: </span>{activeCookingStep.tip}</p>
              ) : (
                <p className="mt-auto text-[10px] text-slate-400">Take your time. DiaryDock will keep your place.</p>
              )}
            </div>
          </div>

          <div className="mt-4 grid h-12 shrink-0 grid-cols-[48px_1fr] gap-2">
            <button type="button" onClick={() => moveToCookingStep(cookingStep - 1)} disabled={cookingStep === 0} className="flex items-center justify-center rounded-[18px] border border-white bg-white text-slate-600 shadow-sm disabled:opacity-35" aria-label="Previous step"><UiIcon name="arrow-left" className="h-4 w-4" /></button>
            {cookingStep < cookingSteps.length - 1 ? (
              <button type="button" onClick={() => moveToCookingStep(cookingStep + 1)} className="flex items-center justify-center gap-2 rounded-[18px] bg-[#263b35] text-sm font-semibold text-white shadow-sm">Next step <UiIcon name="chevron-right" className="h-4 w-4" /></button>
            ) : (
              <button type="button" onClick={finishRecipe} className="flex items-center justify-center gap-2 rounded-[18px] bg-[#6f8f62] text-sm font-semibold text-white shadow-sm"><UiIcon name="check" className="h-4 w-4" />Finish recipe</button>
            )}
          </div>
        </main>
      </div>
      <CookingIngredients controller={controller} />
    </div>
  );
}

function CookingIngredients({ controller }: Props) {
  const {
    showCookingIngredients, setShowCookingIngredients, selected, selectedChecked,
    toggleIngredient, scaledIngredients, addMissingIngredientsToShopping, shoppingMessage
  } = controller;
  if (!showCookingIngredients) return null;
  return (
    <div className="absolute inset-0 z-[100] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setShowCookingIngredients(false)} role="presentation">
      <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Recipe ingredients" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">For this recipe</p><h2 className="mt-1 font-serif text-xl font-semibold">Ingredients</h2></div>
          <button type="button" onClick={() => setShowCookingIngredients(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close ingredients">x</button>
        </div>
        <div className="mt-4 grid max-h-[40svh] grid-cols-2 gap-2 overflow-y-auto">
          {selected.ingredients.map((ingredient, index) => (
            <button key={ingredient} type="button" onClick={() => toggleIngredient(ingredient)} className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[10px] font-medium ${selectedChecked.includes(ingredient) ? "bg-[#dce9d6] text-[#52684a]" : "bg-[#f2f0e9] text-slate-600"}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${selectedChecked.includes(ingredient) ? "bg-[#719064] text-white" : "border border-slate-300 bg-white"}`}>{selectedChecked.includes(ingredient) ? <UiIcon name="check" className="h-3 w-3" /> : null}</span>
              {scaledIngredients[index]}
            </button>
          ))}
        </div>
        <button type="button" onClick={addMissingIngredientsToShopping} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#263b35] text-xs font-semibold text-white"><UiIcon name="plus" className="h-4 w-4" />Add missing to shopping list</button>
        {shoppingMessage ? <p className="mt-2 text-center text-[10px] font-medium text-[#607b55]">{shoppingMessage}</p> : null}
      </section>
    </div>
  );
}
