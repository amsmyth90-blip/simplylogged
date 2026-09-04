"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import { mealImageStyle } from "./kitchen-recipes-model";
import type { KitchenRecipesController } from "./useKitchenRecipesController";

type Props = { controller: KitchenRecipesController };

export function KitchenRecipesHome({ controller }: Props) {
  const {
    canReturnToDirectory, setCanReturnToDirectory, setDirectoryOpen, hasRecipes, selected,
    toggleFavourite, setRecipeOptionsOpen, servings, selectedChecked, scaledIngredients,
    toggleIngredient, recipes, selectRecipe, setCooking, setPlannerOpen
  } = controller;

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[max(124px,calc(env(safe-area-inset-bottom)+124px))] pt-[max(12px,env(safe-area-inset-top))]">
      <header className="flex h-12 shrink-0 items-center gap-3">
        {canReturnToDirectory ? (
          <button type="button" onClick={() => { setCanReturnToDirectory(false); setDirectoryOpen(true); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)]" aria-label="Back to recipe search">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </button>
        ) : (
          <Link href="/room/kitchen" className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)]" aria-label="Back to Kitchen">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#718c65]">Kitchen</p>
          <h1 className="font-serif text-[21px] font-semibold leading-5 tracking-tight">Family recipes</h1>
        </div>
        {hasRecipes ? (
          <>
            <button type="button" onClick={toggleFavourite}
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)] ${selected.favourite ? "text-amber-500" : "text-slate-400"}`}
              aria-label={selected.favourite ? "Remove from favourites" : "Add to favourites"}
              aria-pressed={Boolean(selected.favourite)}>
              <UiIcon name="star" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setRecipeOptionsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-[18px] font-bold tracking-widest text-slate-500 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)]"
              aria-label="Recipe options">···</button>
          </>
        ) : (
          <button type="button" onClick={() => setDirectoryOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-[#66805c] shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)]" aria-label="Add your first recipe">
            <UiIcon name="plus" className="h-4 w-4" />
          </button>
        )}
      </header>

      <main className="mt-2 flex min-h-0 flex-1 flex-col">
        {hasRecipes ? (
          <>
            <section className="relative grid h-[48svh] min-h-[300px] max-h-[420px] shrink-0 grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-[25px] border border-[#e8e0d4] bg-[#fffdf8] shadow-[0_24px_55px_-32px_rgba(68,55,37,0.55)]">
              <div className="min-h-0 bg-cover bg-center" style={mealImageStyle(selected.image)} role="img" aria-label={selected.name} />
              <div className="relative min-h-0 px-3 pb-3 pt-4">
                <span className="absolute inset-y-0 left-0 w-px bg-[#ddd4c7]" />
                <span className="absolute -left-[5px] top-0 h-full w-[10px] bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_10px,#9f927c_11px,#9f927c_13px,transparent_14px,transparent_22px)] opacity-90" />
                <h2 className="max-w-[120px] font-serif text-[17px] font-semibold leading-[19px]">{selected.name}</h2>
                <div className="mt-2 h-px bg-[#e5ded2]"><span className="block h-px w-5 bg-[#719064]" /></div>
                <div className="mt-2 flex items-center justify-between text-[8px] text-slate-500">
                  <span>Ingredients · {servings} servings</span><span>{selectedChecked.length} of {selected.ingredients.length}</span>
                </div>
                <div className="mt-1.5 grid gap-[3px]">
                  {selected.ingredients.map((ingredient, index) => {
                    const isChecked = selectedChecked.includes(ingredient);
                    return (
                      <button key={ingredient} type="button" onClick={() => toggleIngredient(ingredient)} className="flex min-w-0 items-center gap-1.5 text-left text-[8px] leading-[12px] text-slate-700">
                        <span className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${isChecked ? "border-[#6f8f62] bg-[#719064] text-white" : "border-[#bab7ad] bg-white"}`}>
                          {isChecked ? <UiIcon name="check" className="h-2.5 w-2.5" /> : null}
                        </span>
                        <span className="truncate">{scaledIngredients[index]}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="pointer-events-none absolute bottom-0 right-1 h-[72%] w-[22px] rounded-r-full border-r-[3px] border-[#719064]" />
                <span className="pointer-events-none absolute bottom-0 right-[5px] h-3 w-3 translate-y-1/2 rounded-full bg-[#719064] shadow-sm" />
              </div>
            </section>

            <section className="mt-3 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-[12px] font-semibold text-[#423d35]">You might also like</h2>
                <button type="button" onClick={() => setDirectoryOpen(true)} className="flex items-center gap-1 text-[9px] font-bold text-[#66805c]">View all <UiIcon name="chevron-right" className="h-3 w-3" /></button>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {recipes.filter(recipe => recipe.id !== selected.id).slice(0, 3).map(recipe => (
                  <button key={recipe.id} type="button" onClick={() => selectRecipe(recipe)} className="min-w-0 text-left">
                    <span className="block aspect-[1.45/1] rounded-[10px] bg-cover bg-center shadow-[0_8px_18px_-13px_rgba(15,23,42,0.6)]" style={mealImageStyle(recipe.image)} />
                    <span className="mt-1 block truncate font-serif text-[9px] font-semibold text-slate-800">{recipe.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[7px] text-slate-500"><UiIcon name="clock" className="h-2.5 w-2.5" />{recipe.time}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="mx-auto mt-3 grid h-10 w-full shrink-0 grid-cols-[1fr_0.82fr] gap-2">
              <button type="button" onClick={() => setCooking(true)}
                className="flex items-center justify-center gap-2 rounded-full bg-[#6f8f62] text-[11px] font-semibold text-white shadow-[0_13px_26px_-15px_rgba(67,101,55,0.75)] transition active:scale-[0.98]">
                <UiIcon name="clock" className="h-4 w-4" />Start cooking
              </button>
              <button type="button" onClick={() => setPlannerOpen(true)} className="flex items-center justify-center gap-2 rounded-full border border-[#d7e3d1] bg-[#fffdf8] text-[11px] font-semibold text-[#607b55] shadow-sm"><UiIcon name="calendar" className="h-4 w-4" />Add to day</button>
            </div>
          </>
        ) : (
          <EmptyRecipeBook controller={controller} />
        )}
      </main>
    </div>
  );
}

function EmptyRecipeBook({ controller }: Props) {
  const { setDirectoryOpen, scanInputRef, scanRecipe, openNewRecipeEditor } = controller;
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[28px] border border-[#e8e0d4] bg-[#fffdf8] px-6 text-center shadow-[0_24px_55px_-32px_rgba(68,55,37,0.55)]">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e6eee2] text-[#66805c]"><UiIcon name="file" className="h-7 w-7" /></span>
      <h2 className="mt-5 font-serif text-2xl font-semibold text-[#263b35]">Start your recipe book</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Save a recipe from the online catalogue or scan one from a cookbook, recipe card or handwritten note.</p>
      <div className="mt-6 grid w-full max-w-xs gap-3">
        <button type="button" onClick={() => setDirectoryOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#6f8f62] text-sm font-semibold text-white shadow-[0_13px_26px_-15px_rgba(67,101,55,0.75)]"><UiIcon name="search" className="h-4 w-4" />Find a recipe</button>
        <button type="button" onClick={() => scanInputRef.current?.click()} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#d7e3d1] bg-white text-sm font-semibold text-[#607b55]"><UiIcon name="camera" className="h-4 w-4" />Scan a recipe</button>
        <button type="button" onClick={openNewRecipeEditor} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#d7e3d1] bg-white text-sm font-semibold text-[#607b55]"><UiIcon name="plus" className="h-4 w-4" />Add manually</button>
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void scanRecipe(file); event.target.value = ""; }} />
      </div>
    </section>
  );
}
