"use client";

import { UiIcon } from "@/components/UiIcon";

import { mealImageStyle } from "./kitchen-recipes-model";
import type { KitchenRecipesController } from "./useKitchenRecipesController";

type Props = { controller: KitchenRecipesController };

export function RecipeDirectory({ controller }: Props) {
  const {
    directoryOpen, setDirectoryOpen, clearSearch, recipes, search, changeSearch, searchOnline,
    onlineLoading, scanInputRef, scanRecipe, openNewRecipeEditor, onlineCorrection, onlineRecipes,
    selectRecipe, onlineError, visibleRecipes, selected
  } = controller;
  if (!directoryOpen) return null;

  return (
    <div data-testid="recipe-directory" className="absolute inset-0 z-[65] bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.98),transparent_40%),linear-gradient(180deg,#f7f6f1,#edf3e9)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3">
          <button type="button" onClick={() => { setDirectoryOpen(false); clearSearch(); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-sm" aria-label="Close recipe directory">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#718c65]">Kitchen</p>
            <h2 className="font-serif text-[21px] font-semibold leading-5 tracking-tight">Recipe directory</h2>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-[#66805c] shadow-sm">{recipes.length} dishes</span>
        </header>

        <label className="mt-3 flex h-11 shrink-0 items-center gap-2.5 rounded-[18px] border border-white/90 bg-[#fffdf8] px-3.5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <UiIcon name="search" className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={event => changeSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void searchOnline(); }} placeholder="Search dishes or ingredients" className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400" />
          <button type="button" onClick={() => void searchOnline()} disabled={search.trim().length < 2 || onlineLoading} className="rounded-full bg-[#6f8f62] px-3 py-1.5 text-[9px] font-semibold text-white disabled:opacity-40">{onlineLoading ? "Searching" : "Search"}</button>
        </label>

        <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-2">
          <button type="button" onClick={() => scanInputRef.current?.click()} className="flex h-10 items-center justify-center gap-2 rounded-[16px] bg-[#263b35] text-[10px] font-semibold text-white shadow-sm"><UiIcon name="camera" className="h-4 w-4" />Scan recipe</button>
          <button type="button" onClick={clearSearch} className="flex h-10 items-center justify-center gap-2 rounded-[16px] border border-white bg-white text-[10px] font-semibold text-slate-700 shadow-sm"><UiIcon name="folder" className="h-4 w-4" />My recipes</button>
          <button type="button" onClick={openNewRecipeEditor} className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-[16px] border border-[#d7e3d1] bg-[#fffdf8] text-[10px] font-semibold text-[#607b55] shadow-sm"><UiIcon name="plus" className="h-4 w-4" />Add recipe manually</button>
          <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void scanRecipe(file); event.target.value = ""; }} />
        </div>

        <main className="mt-3 min-h-0 flex-1 overflow-y-auto pb-3 pr-1 [scrollbar-color:#a8bc9f_transparent] [scrollbar-width:thin]">
          {onlineCorrection ? <p className="mb-3 rounded-2xl bg-[#e6eee2] px-3 py-2 text-center text-[10px] text-[#52684a]">Showing results for <span className="font-bold">{onlineCorrection}</span></p> : null}
          {onlineRecipes.length ? (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-serif text-[12px] font-semibold">Online recipes</h3>
                <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-[#718c65]">Scroll to browse <span aria-hidden="true">↓</span></span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {onlineRecipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} online onSelect={() => selectRecipe(recipe, true)} />
                ))}
              </div>
            </div>
          ) : null}
          {onlineError ? <p className="mb-3 rounded-2xl bg-white px-3 py-2.5 text-center text-[10px] text-slate-500">{onlineError}</p> : null}
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-[12px] font-semibold">Saved in DiaryDock</h3>
            <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">{visibleRecipes.length} dishes</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {visibleRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} selected={selected.id === recipe.id} onSelect={() => selectRecipe(recipe)} />
            ))}
          </div>
          {!visibleRecipes.length ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-[24px] border border-white bg-white text-center">
              <UiIcon name="search" className="h-6 w-6 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-600">No matching dishes</p>
              <p className="mt-1 text-[10px] text-slate-400">Try a recipe name or ingredient.</p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

type CardProps = {
  recipe: KitchenRecipesController["selected"];
  selected?: boolean;
  online?: boolean;
  onSelect: () => void;
};

function RecipeCard({ recipe, selected, online, onSelect }: CardProps) {
  return (
    <button data-online-recipe-id={online ? recipe.id : undefined} data-recipe-id={online ? undefined : recipe.id} type="button" onClick={onSelect} className={`overflow-hidden rounded-[22px] border bg-[#fffdf8] text-left shadow-[0_16px_35px_-25px_rgba(38,51,43,0.55)] ${selected ? "border-[#78956b] ring-2 ring-[#a8bc9f]/45" : "border-white"}`}>
      <span className="relative block aspect-[1.25/1] bg-cover bg-center" style={mealImageStyle(recipe.image)}>
        {selected ? <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#6f8f62] text-white shadow-sm"><UiIcon name="check" className="h-3.5 w-3.5" /></span> : null}
        {!online && recipe.favourite ? <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm"><UiIcon name="star" className="h-3.5 w-3.5" /></span> : null}
      </span>
      <span className="block px-3 pb-3 pt-2.5">
        <span className={`${online ? "line-clamp-2" : ""} block font-serif text-[13px] font-semibold leading-4 text-slate-800`}>{recipe.name}</span>
        <span className={`mt-1.5 flex items-center gap-1 text-[8px] ${online ? "text-[#66805c]" : "text-slate-500"}`}>
          <UiIcon name={online ? "plus" : "clock"} className="h-3 w-3" />{online ? "Save recipe" : recipe.time}
        </span>
      </span>
    </button>
  );
}
