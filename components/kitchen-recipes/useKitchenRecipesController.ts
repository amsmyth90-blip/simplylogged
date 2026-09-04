"use client";

import { useEffect, useRef, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  getKitchenRecipeSteps,
  scaleRecipeIngredient,
  type KitchenRecipe
} from "@/lib/kitchen-recipes";
import { getMealKey, getWeekDates } from "@/lib/meal-planner";

import {
  applyRecipeDraft,
  createRecipe,
  draftForRecipe,
  emptyRecipe,
  emptyRecipeDraft,
  ingredientKey,
  recipeImageTerms,
  type RecipeEditDraft
} from "./kitchen-recipes-model";
import { useRecipeDiscovery } from "./useRecipeDiscovery";

export function useKitchenRecipesController() {
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
  const discovery = useRecipeDiscovery({
    updateState,
    selectRecipeId: setSelectedId,
    closeDirectory: () => setDirectoryOpen(false)
  });
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
    .filter(recipe => `${recipe.name} ${recipe.ingredients.join(" ")}`
      .toLowerCase().includes(discovery.search.trim().toLowerCase()))
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
    if (progress && recipes.some(recipe => recipe.id === progress.recipeId)) {
      setSelectedId(progress.recipeId);
    }
  }, [recipes, state.kitchenCookingProgress]);

  useEffect(() => {
    if (deepLinkHandledRef.current || !recipes.length) return;
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("recipe");
    const linkedRecipe = recipes.find(recipe => recipe.id === recipeId);
    if (!recipeId || !linkedRecipe) return;
    deepLinkHandledRef.current = true;
    setSelectedId(recipeId);
    setServings(linkedRecipe.servings ?? 4);
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

  const toggleFavourite = () => updateState(current => ({
    ...current,
    kitchenRecipes: current.kitchenRecipes.map(recipe =>
      recipe.id === selected.id ? { ...recipe, favourite: !recipe.favourite } : recipe
    )
  }));

  const openRecipeEditor = () => {
    setEditingNewRecipe(false);
    setRecipeOptionsOpen(false);
    setEditDraft(draftForRecipe(selected));
  };

  const openNewRecipeEditor = () => {
    setCanReturnToDirectory(directoryOpen);
    setEditingNewRecipe(true);
    setDirectoryOpen(false);
    setEditDraft(emptyRecipeDraft());
  };

  const saveRecipeEdits = () => {
    if (!editDraft?.name.trim()) return;
    if (editingNewRecipe) {
      const recipe = createRecipe(editDraft);
      updateState(current => ({ ...current, kitchenRecipes: [recipe, ...current.kitchenRecipes] }));
      setSelectedId(recipe.id);
      setServings(recipe.servings ?? 4);
    } else {
      updateState(current => ({
        ...current,
        kitchenRecipes: current.kitchenRecipes.map(recipe =>
          recipe.id === selected.id ? applyRecipeDraft(recipe, editDraft) : recipe
        )
      }));
      setServings(Math.max(1, editDraft.servings));
    }
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

  const persistCookingProgress = (stepIndex: number, nextServings: number) => {
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
    if (cookingMode) persistCookingProgress(cookingStep, safeServings);
  };

  const moveToCookingStep = (nextStep: number) => {
    const safeStep = Math.min(cookingSteps.length - 1, Math.max(0, nextStep));
    setCookingStep(safeStep);
    persistCookingProgress(safeStep, servings);
  };

  const addMissingIngredientsToShopping = () => {
    const missing = scaledIngredients.filter((_, index) =>
      !selectedChecked.includes(selected.ingredients[index])
    );
    if (!missing.length) {
      setShoppingMessage("You already have every ingredient marked.");
      return;
    }
    let addedCount = 0;
    updateState(current => {
      const existing = new Set(current.kitchenItems.map(item => ingredientKey(item.name)));
      const additions = missing.filter(item => {
        const key = ingredientKey(item);
        if (existing.has(key)) return false;
        existing.add(key);
        addedCount += 1;
        return true;
      }).map(item => ({
        id: `shopping-${crypto.randomUUID()}`,
        name: item,
        checked: false,
        section: "Shopping" as const
      }));
      return { ...current, kitchenItems: [...current.kitchenItems, ...additions] };
    });
    setShoppingMessage(addedCount
      ? `${addedCount} item${addedCount === 1 ? "" : "s"} added to the shared shopping list.`
      : "Those ingredients are already on the shopping list.");
  };

  const addRecipeToPlanner = (date: Date, dayIndex: number) => {
    const matchedImageIndex = recipeImageTerms.findIndex(value =>
      selected.id.includes(value) || selected.name.toLowerCase().includes(value)
    );
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
          imageIndex: matchedImageIndex >= 0 ? matchedImageIndex : dayIndex
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

  return {
    state, recipes, scanInputRef, checked, setChecked, cooking, setCooking, cookingMode,
    setCookingMode, cookingStep, servings, showCookingIngredients, setShowCookingIngredients,
    recipeOptionsOpen, setRecipeOptionsOpen, editDraft, setEditDraft, editingNewRecipe,
    setEditingNewRecipe, deleteConfirmOpen, setDeleteConfirmOpen, shoppingMessage, plannerOpen,
    setPlannerOpen, plannedMessage, canReturnToDirectory, setCanReturnToDirectory, directoryOpen,
    setDirectoryOpen, hasRecipes, selected, selectedChecked, cookingSteps, activeCookingStep,
    scaledIngredients, visibleRecipes, planningDates, ...discovery, toggleIngredient, selectRecipe,
    toggleFavourite, openRecipeEditor, openNewRecipeEditor, saveRecipeEdits, deleteSelectedRecipe,
    setCookingServings, moveToCookingStep, addMissingIngredientsToShopping, addRecipeToPlanner,
    returnToRecipeDirectory, beginCooking, finishRecipe
  };
}

export type KitchenRecipesController = ReturnType<typeof useKitchenRecipesController>;
