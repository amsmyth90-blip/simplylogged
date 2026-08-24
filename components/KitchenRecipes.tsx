"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  getKitchenRecipeSteps,
  scaleRecipeIngredient,
  type KitchenRecipe
} from "@/lib/kitchen-recipes";
import { getMealKey, getWeekDates } from "@/lib/meal-planner";

type RecipeEditDraft = {
  name: string;
  time: string;
  servings: number;
  ingredients: string;
  instructions: string;
};

const emptyRecipe: KitchenRecipe = {
  id: "empty-recipe-book",
  name: "Your recipe book",
  time: "",
  servings: 4,
  ingredients: [],
  instructions: "",
  image: "",
  source: "diarydock"
};

function mealImageStyle(image: string) {
  return {
    backgroundImage: image
      ? `url('${image}')`
      : "linear-gradient(145deg,#dfe9da,#f4eee2)",
    backgroundPosition: "center",
    backgroundSize: "cover"
  };
}

export function KitchenRecipes() {
  const { state, updateState } = useDiaryDockData();
  const recipes = state.kitchenRecipes;
  const scanInputRef = useRef<HTMLInputElement>(null);
  const deepLinkHandledRef = useRef(false);
  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState<Record<string, string[]>>({});
  const [cooking, setCooking] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const [cookingStep, setCookingStep] = useState(0);
  const [servings, setServings] = useState(4);
  const [showCookingIngredients, setShowCookingIngredients] = useState(false);
  const [recipeOptionsOpen, setRecipeOptionsOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<RecipeEditDraft | null>(null);
  const [editingNewRecipe, setEditingNewRecipe] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannedMessage, setPlannedMessage] = useState("");
  const [canReturnToDirectory, setCanReturnToDirectory] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [onlineRecipes, setOnlineRecipes] = useState<KitchenRecipe[]>([]);
  const [onlineCorrection, setOnlineCorrection] = useState("");
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [scanState, setScanState] = useState<"idle" | "reading" | "saved">("idle");
  const [scanMessage, setScanMessage] = useState("");
  const hasRecipes = recipes.length > 0;
  const selected = recipes.find(recipe => recipe.id === selectedId) ?? recipes[0] ?? emptyRecipe;
  const selectedChecked = checked[selected.id] ?? [];
  const cookingSteps = getKitchenRecipeSteps(selected);
  const activeCookingStep = cookingSteps[cookingStep];
  const originalServings = selected.servings ?? 4;
  const scaledIngredients = selected.ingredients.map(ingredient =>
    scaleRecipeIngredient(ingredient, originalServings, servings)
  );
  const visibleRecipes = [...recipes]
    .filter(recipe =>
      `${recipe.name} ${recipe.ingredients.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((left, right) => Number(Boolean(right.favourite)) - Number(Boolean(left.favourite)));
  const planningDates = getWeekDates();

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  useEffect(() => {
    const progress = state.kitchenCookingProgress;
    if (!progress || !recipes.some(recipe => recipe.id === progress.recipeId)) return;
    setSelectedId(progress.recipeId);
  }, [recipes, state.kitchenCookingProgress]);

  useEffect(() => {
    if (deepLinkHandledRef.current || !recipes.length) return;
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("recipe");
    if (!recipeId || !recipes.some(recipe => recipe.id === recipeId)) return;
    deepLinkHandledRef.current = true;
    setSelectedId(recipeId);
    const linkedRecipe = recipes.find(recipe => recipe.id === recipeId);
    setServings(linkedRecipe?.servings ?? 4);
    if (params.get("cook") === "1") setCooking(true);
  }, [recipes]);

  const toggleIngredient = (ingredient: string) => {
    setChecked(current => {
      const currentRecipe = current[selected.id] ?? [];
      return {
        ...current,
        [selected.id]: currentRecipe.includes(ingredient)
          ? currentRecipe.filter(item => item !== ingredient)
          : [...currentRecipe, ingredient]
      };
    });
  };

  const selectRecipe = (recipe: KitchenRecipe, save = false) => {
    if (save && !recipes.some(item => item.id === recipe.id)) {
      updateState(current => ({ ...current, kitchenRecipes: [recipe, ...current.kitchenRecipes] }));
    }
    setSelectedId(recipe.id);
    setServings(recipe.servings ?? 4);
    setCanReturnToDirectory(directoryOpen);
    setDirectoryOpen(false);
  };

  const toggleFavourite = () => {
    updateState(current => ({
      ...current,
      kitchenRecipes: current.kitchenRecipes.map(recipe =>
        recipe.id === selected.id ? { ...recipe, favourite: !recipe.favourite } : recipe
      )
    }));
  };

  const openRecipeEditor = () => {
    setEditingNewRecipe(false);
    setRecipeOptionsOpen(false);
    setEditDraft({
      name: selected.name,
      time: selected.time,
      servings: selected.servings ?? 4,
      ingredients: selected.ingredients.join("\n"),
      instructions: selected.instructions
    });
  };

  const openNewRecipeEditor = () => {
    setCanReturnToDirectory(directoryOpen);
    setEditingNewRecipe(true);
    setDirectoryOpen(false);
    setEditDraft({
      name: "",
      time: "",
      servings: 4,
      ingredients: "",
      instructions: ""
    });
  };

  const saveRecipeEdits = () => {
    if (!editDraft?.name.trim()) return;
    const ingredients = editDraft.ingredients.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    if (editingNewRecipe) {
      const recipe: KitchenRecipe = {
        id: `recipe-${crypto.randomUUID()}`,
        name: editDraft.name.trim(),
        time: editDraft.time.trim() || "Recipe",
        servings: Math.max(1, editDraft.servings),
        ingredients,
        instructions: editDraft.instructions.trim(),
        image: "",
        source: "diarydock"
      };
      updateState(current => ({ ...current, kitchenRecipes: [recipe, ...current.kitchenRecipes] }));
      setSelectedId(recipe.id);
      setServings(recipe.servings ?? 4);
      setEditingNewRecipe(false);
      setEditDraft(null);
      return;
    }
    updateState(current => ({
      ...current,
      kitchenRecipes: current.kitchenRecipes.map(recipe => recipe.id === selected.id ? {
        ...recipe,
        name: editDraft.name.trim(),
        time: editDraft.time.trim() || recipe.time,
        servings: Math.max(1, editDraft.servings),
        ingredients: ingredients.length ? ingredients : recipe.ingredients,
        instructions: editDraft.instructions.trim() || recipe.instructions
      } : recipe)
    }));
    setServings(Math.max(1, editDraft.servings));
    setEditingNewRecipe(false);
    setEditDraft(null);
  };

  const deleteSelectedRecipe = () => {
    if (recipes.length <= 1) return;
    const nextRecipe = recipes.find(recipe => recipe.id !== selected.id);
    updateState(current => ({
      ...current,
      kitchenRecipes: current.kitchenRecipes.filter(recipe => recipe.id !== selected.id),
      kitchenCookingProgress: current.kitchenCookingProgress?.recipeId === selected.id
        ? null
        : current.kitchenCookingProgress
    }));
    if (nextRecipe) {
      setSelectedId(nextRecipe.id);
      setServings(nextRecipe.servings ?? 4);
    }
    setDeleteConfirmOpen(false);
    setRecipeOptionsOpen(false);
  };

  const persistCookingProgress = (
    stepIndex: number,
    nextServings: number
  ) => {
    updateState(current => ({
      ...current,
      kitchenCookingProgress: {
        recipeId: selected.id,
        stepIndex,
        servings: nextServings,
        timerRemainingSeconds: 0,
        timerEndsAt: null,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const setCookingServings = (nextServings: number) => {
    const safeServings = Math.min(12, Math.max(1, nextServings));
    setServings(safeServings);
    if (cookingMode) {
      persistCookingProgress(cookingStep, safeServings);
    }
  };

  const moveToCookingStep = (nextStep: number) => {
    const safeStep = Math.min(cookingSteps.length - 1, Math.max(0, nextStep));
    setCookingStep(safeStep);
    persistCookingProgress(safeStep, servings);
  };

  const addMissingIngredientsToShopping = () => {
    const missing = scaledIngredients.filter((_, index) => !selectedChecked.includes(selected.ingredients[index]));
    if (!missing.length) {
      setShoppingMessage("You already have every ingredient marked.");
      return;
    }

    const ingredientKey = (value: string) => value
      .toLowerCase()
      .replace(/^\d+(?:\.\d+)?\s*(?:x\s*)?(?:g|kg|ml|l|tbsp|tsp)?\s*/i, "")
      .trim();

    let addedCount = 0;
    updateState(current => {
      const existing = new Set(current.kitchenItems.map(item => ingredientKey(item.name)));
      const additions = missing
        .filter(item => {
          const key = ingredientKey(item);
          if (existing.has(key)) return false;
          existing.add(key);
          addedCount += 1;
          return true;
        })
        .map(item => ({
          id: `shopping-${crypto.randomUUID()}`,
          name: item,
          checked: false,
          section: "Shopping" as const
        }));
      return { ...current, kitchenItems: [...current.kitchenItems, ...additions] };
    });
    setShoppingMessage(addedCount ? `${addedCount} item${addedCount === 1 ? "" : "s"} added to the shared shopping list.` : "Those ingredients are already on the shopping list.");
  };

  const addRecipeToPlanner = (date: Date, dayIndex: number) => {
    const matchedImageIndex = ["salmon", "pasta", "traybake", "tacos", "curry", "pizza", "roast"].findIndex(value =>
      selected.id.includes(value) || selected.name.toLowerCase().includes(value)
    );
    const imageIndex = matchedImageIndex >= 0 ? matchedImageIndex : dayIndex;
    updateState(current => ({
      ...current,
      mealPlan: {
        ...current.mealPlan,
        [getMealKey(date)]: {
          recipeId: selected.id,
          name: selected.name,
          cookTime: selected.time,
          servings,
          note: selected.instructions,
          imageIndex
        }
      }
    }));
    setPlannedMessage(`${selected.name} added to ${date.toLocaleDateString("en-GB", { weekday: "long" })}.`);
  };

  const returnToRecipeDirectory = () => {
    setPlannerOpen(false);
    setPlannedMessage("");
    setCanReturnToDirectory(false);
    setDirectoryOpen(true);
  };

  const searchOnline = async () => {
    if (search.trim().length < 2) return;
    setOnlineLoading(true);
    setOnlineError("");
    try {
      const response = await fetch(`/api/kitchen/recipes/search?q=${encodeURIComponent(search.trim())}`);
      const payload = await response.json() as { recipes?: KitchenRecipe[]; correctedQuery?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to search recipes.");
      setOnlineRecipes(payload.recipes ?? []);
      setOnlineCorrection(payload.correctedQuery ?? "");
      if (!payload.recipes?.length) setOnlineError("No online recipes matched that search.");
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : "Unable to search recipes.");
    } finally {
      setOnlineLoading(false);
    }
  };

  const scanRecipe = async (file: File) => {
    setScanState("reading");
    setScanMessage("Reading the recipe and finding its matching dish photo...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/kitchen/recipes/scan", { method: "POST", body: formData });
      const payload = await response.json() as { recipe?: KitchenRecipe; matchedPhoto?: boolean; error?: string };
      if (!response.ok || !payload.recipe) throw new Error(payload.error || "The recipe could not be read.");
      const recipe = payload.recipe;
      updateState(current => ({ ...current, kitchenRecipes: [recipe, ...current.kitchenRecipes.filter(item => item.id !== recipe.id)] }));
      setSelectedId(recipe.id);
      setScanState("saved");
      setScanMessage(payload.matchedPhoto ? "Recipe saved with a matching dish photo." : "Recipe saved. Add a dish photo later for the best result.");
      window.setTimeout(() => {
        setScanState("idle");
        setDirectoryOpen(false);
      }, 1400);
    } catch (error) {
      setScanState("idle");
      setScanMessage("");
      setOnlineError(error instanceof Error ? error.message : "The recipe could not be read.");
    }
  };

  const beginCooking = () => {
    const progress = state.kitchenCookingProgress?.recipeId === selected.id
      ? state.kitchenCookingProgress
      : null;
    const nextStep = Math.min(cookingSteps.length - 1, Math.max(0, progress?.stepIndex ?? 0));
    const nextServings = progress?.servings ?? selected.servings ?? 4;

    setCooking(false);
    setCookingStep(nextStep);
    setServings(nextServings);
    setShowCookingIngredients(false);
    setCookingMode(true);
    persistCookingProgress(nextStep, nextServings);
  };

  const finishRecipe = () => {
    updateState(current => ({ ...current, kitchenCookingProgress: null }));
    setCookingMode(false);
    setCookingStep(0);
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.98),transparent_38%),linear-gradient(180deg,#fbfaf7_0%,#f7f4ee_57%,#f2f0e9_100%)] text-[#172033]">
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
              <button type="button" onClick={toggleFavourite} className={`flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)] ${selected.favourite ? "text-amber-500" : "text-slate-400"}`} aria-label={selected.favourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={Boolean(selected.favourite)}>
                <UiIcon name="star" className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setRecipeOptionsOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-[18px] font-bold tracking-widest text-slate-500 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)]" aria-label="Recipe options">
                ···
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setDirectoryOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-[#66805c] shadow-[0_8px_20px_-12px_rgba(15,23,42,0.4)]" aria-label="Add your first recipe">
              <UiIcon name="plus" className="h-4 w-4" />
            </button>
          )}
        </header>

        <main className="mt-2 flex min-h-0 flex-1 flex-col">
          {hasRecipes ? <>
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
              <button type="button" onClick={() => setDirectoryOpen(true)} className="flex items-center gap-1 text-[9px] font-bold text-[#66805c]">
                View all <UiIcon name="chevron-right" className="h-3 w-3" />
              </button>
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
            <button type="button" onClick={() => setCooking(true)} className="flex items-center justify-center gap-2 rounded-full bg-[#6f8f62] text-[11px] font-semibold text-white shadow-[0_13px_26px_-15px_rgba(67,101,55,0.75)] transition active:scale-[0.98]">
              <UiIcon name="clock" className="h-4 w-4" />Start cooking
            </button>
            <button type="button" onClick={() => setPlannerOpen(true)} className="flex items-center justify-center gap-2 rounded-full border border-[#d7e3d1] bg-[#fffdf8] text-[11px] font-semibold text-[#607b55] shadow-sm">
              <UiIcon name="calendar" className="h-4 w-4" />Add to day
            </button>
          </div>
          </> : (
            <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[28px] border border-[#e8e0d4] bg-[#fffdf8] px-6 text-center shadow-[0_24px_55px_-32px_rgba(68,55,37,0.55)]">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e6eee2] text-[#66805c]">
                <UiIcon name="file" className="h-7 w-7" />
              </span>
              <h2 className="mt-5 font-serif text-2xl font-semibold text-[#263b35]">Start your recipe book</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Save a recipe from the online catalogue or scan one from a cookbook, recipe card or handwritten note.</p>
              <div className="mt-6 grid w-full max-w-xs gap-3">
                <button type="button" onClick={() => setDirectoryOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#6f8f62] text-sm font-semibold text-white shadow-[0_13px_26px_-15px_rgba(67,101,55,0.75)]">
                  <UiIcon name="search" className="h-4 w-4" />Find a recipe
                </button>
                <button type="button" onClick={() => scanInputRef.current?.click()} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#d7e3d1] bg-white text-sm font-semibold text-[#607b55]">
                  <UiIcon name="camera" className="h-4 w-4" />Scan a recipe
                </button>
                <button type="button" onClick={openNewRecipeEditor} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#d7e3d1] bg-white text-sm font-semibold text-[#607b55]">
                  <UiIcon name="plus" className="h-4 w-4" />Add manually
                </button>
                <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void scanRecipe(file); event.target.value = ""; }} />
              </div>
            </section>
          )}
        </main>
      </div>

      {directoryOpen ? (
        <div data-testid="recipe-directory" className="absolute inset-0 z-[65] bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.98),transparent_40%),linear-gradient(180deg,#f7f6f1,#edf3e9)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
          <div className="mx-auto flex h-full w-full max-w-lg flex-col">
            <header className="flex h-12 shrink-0 items-center gap-3">
              <button type="button" onClick={() => { setDirectoryOpen(false); setSearch(""); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-sm" aria-label="Close recipe directory">
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
              <input value={search} onChange={event => { setSearch(event.target.value); setOnlineRecipes([]); setOnlineCorrection(""); setOnlineError(""); }} onKeyDown={event => { if (event.key === "Enter") void searchOnline(); }} placeholder="Search dishes or ingredients" className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => void searchOnline()} disabled={search.trim().length < 2 || onlineLoading} className="rounded-full bg-[#6f8f62] px-3 py-1.5 text-[9px] font-semibold text-white disabled:opacity-40">
                {onlineLoading ? "Searching" : "Search"}
              </button>
            </label>

            <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-2">
              <button type="button" onClick={() => scanInputRef.current?.click()} className="flex h-10 items-center justify-center gap-2 rounded-[16px] bg-[#263b35] text-[10px] font-semibold text-white shadow-sm">
                <UiIcon name="camera" className="h-4 w-4" />Scan recipe
              </button>
              <button type="button" onClick={() => { setSearch(""); setOnlineRecipes([]); setOnlineCorrection(""); setOnlineError(""); }} className="flex h-10 items-center justify-center gap-2 rounded-[16px] border border-white bg-white text-[10px] font-semibold text-slate-700 shadow-sm">
                <UiIcon name="folder" className="h-4 w-4" />My recipes
              </button>
              <button type="button" onClick={openNewRecipeEditor} className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-[16px] border border-[#d7e3d1] bg-[#fffdf8] text-[10px] font-semibold text-[#607b55] shadow-sm">
                <UiIcon name="plus" className="h-4 w-4" />Add recipe manually
              </button>
              <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void scanRecipe(file); event.target.value = ""; }} />
            </div>

            <main className="mt-3 min-h-0 flex-1 overflow-y-auto pb-3 pr-1 [scrollbar-color:#a8bc9f_transparent] [scrollbar-width:thin]">
              {onlineCorrection ? (
                <p className="mb-3 rounded-2xl bg-[#e6eee2] px-3 py-2 text-center text-[10px] text-[#52684a]">
                  Showing results for <span className="font-bold">{onlineCorrection}</span>
                </p>
              ) : null}
              {onlineRecipes.length ? (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-serif text-[12px] font-semibold">Online recipes</h3>
                    <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-[#718c65]">Scroll to browse <span aria-hidden="true">↓</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {onlineRecipes.map(recipe => (
                      <button key={recipe.id} data-online-recipe-id={recipe.id} type="button" onClick={() => selectRecipe(recipe, true)} className="overflow-hidden rounded-[22px] border border-white bg-[#fffdf8] text-left shadow-[0_16px_35px_-25px_rgba(38,51,43,0.55)]">
                        <span className="block aspect-[1.25/1] bg-cover bg-center" style={mealImageStyle(recipe.image)} />
                        <span className="block px-3 pb-3 pt-2.5">
                          <span className="block line-clamp-2 font-serif text-[13px] font-semibold leading-4 text-slate-800">{recipe.name}</span>
                          <span className="mt-1.5 flex items-center gap-1 text-[8px] text-[#66805c]"><UiIcon name="plus" className="h-3 w-3" />Save recipe</span>
                        </span>
                      </button>
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
                  <button key={recipe.id} data-recipe-id={recipe.id} type="button" onClick={() => selectRecipe(recipe)} className={`overflow-hidden rounded-[22px] border bg-[#fffdf8] text-left shadow-[0_16px_35px_-25px_rgba(38,51,43,0.55)] ${selected.id === recipe.id ? "border-[#78956b] ring-2 ring-[#a8bc9f]/45" : "border-white"}`}>
                    <span className="relative block aspect-[1.25/1] bg-cover bg-center" style={mealImageStyle(recipe.image)}>
                      {selected.id === recipe.id ? <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#6f8f62] text-white shadow-sm"><UiIcon name="check" className="h-3.5 w-3.5" /></span> : null}
                      {recipe.favourite ? <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm"><UiIcon name="star" className="h-3.5 w-3.5" /></span> : null}
                    </span>
                    <span className="block px-3 pb-3 pt-2.5">
                      <span className="block font-serif text-[13px] font-semibold leading-4 text-slate-800">{recipe.name}</span>
                      <span className="mt-1.5 flex items-center gap-1 text-[8px] text-slate-500"><UiIcon name="clock" className="h-3 w-3" />{recipe.time}</span>
                    </span>
                  </button>
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
      ) : null}

      {scanState !== "idle" ? (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#1b2a25]/30 p-6 backdrop-blur-md">
          <section className="w-full max-w-sm rounded-[30px] border border-white/90 bg-[#fffdf8] p-6 text-center shadow-2xl">
            <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${scanState === "saved" ? "bg-[#dfead9] text-[#5e7a53]" : "bg-[#263b35] text-white"}`}>
              {scanState === "saved" ? <UiIcon name="check" className="h-7 w-7" /> : <UiIcon name="camera" className="h-7 w-7 animate-pulse" />}
            </span>
            <h2 className="mt-4 font-serif text-xl font-semibold">{scanState === "saved" ? "Recipe saved" : "Reading your recipe"}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">{scanMessage}</p>
          </section>
        </div>
      ) : null}

      {cooking ? (
        <div className="absolute inset-0 z-[70] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setCooking(false)} role="presentation">
          <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fffdf8] p-5 shadow-2xl backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label={`Cook ${selected.name}`} onClick={event => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 shrink-0 rounded-2xl bg-cover bg-center" style={mealImageStyle(selected.image)} />
              <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#718c65]">{state.kitchenCookingProgress?.recipeId === selected.id ? "Continue cooking" : "Ready to cook"}</p><h2 className="mt-1 truncate font-serif text-xl font-semibold">{selected.name}</h2></div>
              <button type="button" onClick={() => setCooking(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close">x</button>
            </div>
            <div className="mt-4 rounded-2xl bg-[#edf4e9] px-4 py-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#718c65]">{cookingSteps.length} guided steps</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-[#52684a]"><UiIcon name="clock" className="h-3 w-3" />{selected.time}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#52684a]">{selected.instructions}</p>
            </div>
            <button type="button" onClick={beginCooking} className="mt-3 h-11 w-full rounded-2xl bg-[#263b35] text-sm font-semibold text-white">{state.kitchenCookingProgress?.recipeId === selected.id ? `Resume step ${state.kitchenCookingProgress.stepIndex + 1}` : "Begin recipe"}</button>
          </section>
        </div>
      ) : null}

      {cookingMode ? (
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
              <button type="button" onClick={() => setShowCookingIngredients(current => !current)} className="rounded-full border border-white bg-white px-3 py-2 text-[9px] font-bold text-[#607b55] shadow-sm" aria-expanded={showCookingIngredients}>
                Ingredients
              </button>
            </header>

            <div className="mt-3 flex shrink-0 gap-1">
              {cookingSteps.map((_, index) => (
                <span key={index} className={`h-1 flex-1 rounded-full transition-colors ${index <= cookingStep ? "bg-[#708d64]" : "bg-white"}`} />
              ))}
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
                  <h2 className="mt-2 font-serif text-[clamp(20px,6vw,26px)] font-semibold leading-tight text-[#202838]">
                    {activeCookingStep?.title || "Follow the recipe"}
                  </h2>
                  {activeCookingStep?.durationMinutes || activeCookingStep?.temperature ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeCookingStep.durationMinutes ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-[#e8f0e4] px-3 py-1.5 text-[10px] font-bold text-[#58704f]">
                          <UiIcon name="clock" className="h-3.5 w-3.5" />{activeCookingStep.durationMinutes} min
                        </span>
                      ) : null}
                      {activeCookingStep.temperature ? (
                        <span className="rounded-full bg-[#f4e9dd] px-3 py-1.5 text-[10px] font-bold text-[#855f3f]">
                          {activeCookingStep.temperature}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-3 text-[clamp(14px,4vw,17px)] font-medium leading-[1.45] text-[#354052]">
                    {activeCookingStep?.instruction || selected.instructions}
                  </p>
                  {activeCookingStep?.tip ? (
                    <p className="mt-auto rounded-2xl bg-[#fff7df] px-3 py-2 text-[10px] leading-4 text-[#775f32]">
                      <span className="font-bold">Helpful tip: </span>{activeCookingStep.tip}
                    </p>
                  ) : (
                    <p className="mt-auto text-[10px] text-slate-400">Take your time. DiaryDock will keep your place.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid h-12 shrink-0 grid-cols-[48px_1fr] gap-2">
                <button type="button" onClick={() => moveToCookingStep(cookingStep - 1)} disabled={cookingStep === 0} className="flex items-center justify-center rounded-[18px] border border-white bg-white text-slate-600 shadow-sm disabled:opacity-35" aria-label="Previous step">
                  <UiIcon name="arrow-left" className="h-4 w-4" />
                </button>
                {cookingStep < cookingSteps.length - 1 ? (
                  <button type="button" onClick={() => moveToCookingStep(cookingStep + 1)} className="flex items-center justify-center gap-2 rounded-[18px] bg-[#263b35] text-sm font-semibold text-white shadow-sm">
                    Next step <UiIcon name="chevron-right" className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={finishRecipe} className="flex items-center justify-center gap-2 rounded-[18px] bg-[#6f8f62] text-sm font-semibold text-white shadow-sm">
                    <UiIcon name="check" className="h-4 w-4" />Finish recipe
                  </button>
                )}
              </div>
            </main>
          </div>

          {showCookingIngredients ? (
            <div className="absolute inset-0 z-[100] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setShowCookingIngredients(false)} role="presentation">
              <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Recipe ingredients" onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">For this recipe</p><h2 className="mt-1 font-serif text-xl font-semibold">Ingredients</h2></div>
                  <button type="button" onClick={() => setShowCookingIngredients(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close ingredients">x</button>
                </div>
                <div className="mt-4 grid max-h-[40svh] grid-cols-2 gap-2 overflow-y-auto">
                  {selected.ingredients.map((ingredient, index) => (
                    <button key={ingredient} type="button" onClick={() => toggleIngredient(ingredient)} className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[10px] font-medium ${selectedChecked.includes(ingredient) ? "bg-[#dce9d6] text-[#52684a]" : "bg-[#f2f0e9] text-slate-600"}`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${selectedChecked.includes(ingredient) ? "bg-[#719064] text-white" : "border border-slate-300 bg-white"}`}>
                        {selectedChecked.includes(ingredient) ? <UiIcon name="check" className="h-3 w-3" /> : null}
                      </span>
                      {scaledIngredients[index]}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={addMissingIngredientsToShopping} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#263b35] text-xs font-semibold text-white">
                  <UiIcon name="plus" className="h-4 w-4" />Add missing to shopping list
                </button>
                {shoppingMessage ? <p className="mt-2 text-center text-[10px] font-medium text-[#607b55]">{shoppingMessage}</p> : null}
              </section>
            </div>
          ) : null}
        </div>
      ) : null}

      {recipeOptionsOpen ? (
        <div className="absolute inset-0 z-[75] flex items-end bg-[#17211d]/25 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onClick={() => setRecipeOptionsOpen(false)} role="presentation">
          <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Recipe options" onClick={event => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 rounded-2xl bg-cover bg-center" style={mealImageStyle(selected.image)} />
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">Recipe options</p>
                <h2 className="mt-1 truncate font-serif text-xl font-semibold">{selected.name}</h2>
              </div>
              <button type="button" onClick={() => setRecipeOptionsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close recipe options">x</button>
            </div>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={toggleFavourite} className="flex h-12 items-center gap-3 rounded-2xl bg-[#edf4e9] px-4 text-left text-xs font-semibold text-[#52684a]">
                <UiIcon name="star" className="h-4 w-4" />{selected.favourite ? "Remove from favourites" : "Add to favourites"}
              </button>
              <button type="button" onClick={openRecipeEditor} className="flex h-12 items-center gap-3 rounded-2xl bg-slate-100 px-4 text-left text-xs font-semibold text-slate-700">
                <UiIcon name="file" className="h-4 w-4" />Edit recipe
              </button>
              <button type="button" onClick={() => { setRecipeOptionsOpen(false); setDeleteConfirmOpen(true); }} disabled={recipes.length <= 1} className="flex h-12 items-center gap-3 rounded-2xl bg-[#fff0ee] px-4 text-left text-xs font-semibold text-[#a4483d] disabled:opacity-40">
                <UiIcon name="archive" className="h-4 w-4" />Delete recipe
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {plannerOpen ? (
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
                <button type="button" onClick={returnToRecipeDirectory} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#263b35] text-[10px] font-semibold text-white">
                  <UiIcon name="arrow-left" className="h-3.5 w-3.5" />Back to recipe search
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {editDraft ? (
        <div className="absolute inset-0 z-[80] bg-[linear-gradient(180deg,#f8faf5,#f2eee6)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
          <section className="mx-auto flex h-full w-full max-w-lg flex-col" role="dialog" aria-modal="true" aria-label={editingNewRecipe ? "Add recipe" : "Edit recipe"}>
            <header className="flex h-12 shrink-0 items-center gap-3">
              <button type="button" onClick={() => { setEditDraft(null); setEditingNewRecipe(false); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-sm" aria-label="Cancel editing">
                <UiIcon name="arrow-left" className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1"><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">Kitchen</p><h2 className="font-serif text-xl font-semibold">{editingNewRecipe ? "Add recipe" : "Edit recipe"}</h2></div>
              <button type="button" onClick={saveRecipeEdits} className="rounded-full bg-[#263b35] px-4 py-2 text-[10px] font-bold text-white">Save</button>
            </header>
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-[28px] border border-white bg-[#fffdf8] p-4 shadow-[0_25px_60px_-38px_rgba(32,48,39,0.55)]">
              <label className="block"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Recipe name</span><input value={editDraft.name} onChange={event => setEditDraft(current => current ? { ...current, name: event.target.value } : current)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#78956b]" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Total time</span><input value={editDraft.time} onChange={event => setEditDraft(current => current ? { ...current, time: event.target.value } : current)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#78956b]" /></label>
                <label className="block"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Servings</span><input type="number" min="1" max="12" value={editDraft.servings} onChange={event => setEditDraft(current => current ? { ...current, servings: Math.max(1, Number(event.target.value) || 1) } : current)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#78956b]" /></label>
              </div>
              <label className="block"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Ingredients · one per line</span><textarea value={editDraft.ingredients} onChange={event => setEditDraft(current => current ? { ...current, ingredients: event.target.value } : current)} rows={7} className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#78956b]" /></label>
              <label className="block"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Recipe summary</span><textarea value={editDraft.instructions} onChange={event => setEditDraft(current => current ? { ...current, instructions: event.target.value } : current)} rows={4} className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#78956b]" /></label>
            </div>
          </section>
        </div>
      ) : null}

      {deleteConfirmOpen ? (
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
      ) : null}

      <BottomNav />
    </div>
  );
}
