"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  aggregateRecipeIngredients,
  useFullscreenScrollLock,
  useStoredState,
} from "@/components/kitchen-feature/kitchen-feature-model";
import { normaliseRecipeIngredient, scaleRecipeIngredient } from "@/lib/kitchen-recipes";
import {
  defaultMeals,
  getMealKey,
  getPlannedMeal,
  getWeekDates,
  type MealPlanItem,
} from "@/lib/meal-planner";

export type MealPlannerSheetMode = "swap" | "recipe" | "edit" | "move" | null;

export function useMealPlannerController() {
  const { repositoryMode, state, updateState } = useDiaryDockData();
  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayDayIndex);
  const [sheetMode, setSheetMode] = useState<MealPlannerSheetMode>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState("");
  const [draft, setDraft] = useState<MealPlanItem>(defaultMeals[0]);
  const [dragSourceDay, setDragSourceDay] = useState<number | null>(null);
  const [dragTargetDay, setDragTargetDay] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const dragSourceRef = useRef<number | null>(null);
  const dragTargetRef = useRef<number | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [diners, setDiners] = useStoredState<string[]>("diarydock-meal-diners-v2", []);
  const savedMealProfiles = state.householdProfiles.filter((profile) => profile.showInMeals);
  const mealProfiles = useMemo(() => {
    const householdMealProfiles = [
      ...savedMealProfiles,
      ...state.householdMembers
        .filter((member) => !savedMealProfiles.some((profile) =>
          profile.id === member.id ||
          profile.linkedUserId === member.userId ||
          profile.name.toLowerCase() === member.name.toLowerCase(),
        ))
        .map((member, index) => ({
          id: member.id,
          name: member.name,
          colour: (["sage", "blue", "clay", "gold"] as const)[index % 4],
        })),
    ];
    const knownNames = householdMealProfiles.map((profile) => profile.name.toLowerCase());
    const scheduleMealProfiles = Array.from(
      new Set(state.kidSchedules.map((routine) => routine.childName.trim()).filter(Boolean)),
    )
      .filter((name) => !knownNames.includes(name.toLowerCase()))
      .map((name, index) => ({
        id: `schedule-profile-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        colour: (["sage", "blue", "clay", "gold"] as const)[(householdMealProfiles.length + index) % 4],
      }));
    return [...householdMealProfiles, ...scheduleMealProfiles];
  }, [savedMealProfiles, state.householdMembers, state.kidSchedules]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("profile");
    const requestedName = params.get("person");
    const requestedProfile = mealProfiles.find((profile) =>
      profile.id === requestedId ||
      Boolean(requestedName && profile.name.toLowerCase() === requestedName.toLowerCase()),
    );
    if (requestedProfile) {
      setDiners((current) => current.includes(requestedProfile.id)
        ? current
        : [...current, requestedProfile.id]);
    }
  }, [mealProfiles, setDiners]);

  const dates = getWeekDates(weekOffset);
  const selectedDate = dates[selectedDay];
  const selectedKey = getMealKey(selectedDate);
  const selectedMeal = getPlannedMeal(state.mealPlan, selectedDate, selectedDay);
  const findRecipeForMeal = (meal: MealPlanItem | null) => {
    if (!meal) return undefined;
    const mealName = meal.name.toLowerCase();
    return state.kitchenRecipes.find((recipe) => recipe.id === meal.recipeId)
      ?? state.kitchenRecipes.find((recipe) => {
        const recipeName = recipe.name.toLowerCase();
        return recipeName === mealName || recipeName.includes(mealName) || mealName.includes(recipeName);
      });
  };
  const selectedRecipe = findRecipeForMeal(selectedMeal);
  const pantryKeys = state.kitchenItems
    .filter((item) => item.section === "Pantry" && item.checked)
    .map((item) => normaliseRecipeIngredient(item.name))
    .filter(Boolean);
  const weeklyMissingIngredients = aggregateRecipeIngredients(
    dates.flatMap((date, dayIndex) => {
      const meal = getPlannedMeal(state.mealPlan, date, dayIndex);
      const recipe = findRecipeForMeal(meal);
      if (!meal || !recipe) return [];
      return recipe.ingredients.map((ingredient) =>
        scaleRecipeIngredient(ingredient, recipe.servings ?? 4, meal.servings),
      );
    }).filter((ingredient) => {
      const key = normaliseRecipeIngredient(ingredient);
      return key && !pantryKeys.some((pantryKey) =>
        pantryKey === key || pantryKey.includes(key) || key.includes(pantryKey),
      );
    }),
  );
  const weekLabel = `${dates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${dates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  useFullscreenScrollLock();

  const setMeal = (key: string, meal: MealPlanItem | null) => {
    updateState((current) => ({
      ...current,
      mealPlan: { ...current.mealPlan, [key]: meal },
    }));
  };
  const openEditor = () => {
    setDraft(selectedMeal
      ? { ...selectedMeal }
      : { ...defaultMeals[selectedDay], name: "", recipeId: undefined });
    setSheetMode("edit");
  };
  const saveDraft = () => {
    if (!draft.name.trim()) return;
    const linkedRecipe = state.kitchenRecipes.find((recipe) => recipe.id === draft.recipeId);
    const recipeId = linkedRecipe && linkedRecipe.name.toLowerCase() === draft.name.trim().toLowerCase()
      ? linkedRecipe.id
      : undefined;
    setMeal(selectedKey, {
      ...draft,
      recipeId,
      name: draft.name.trim(),
      note: draft.note.trim(),
    });
    setSheetMode(null);
  };
  const addWeekToShopping = () => {
    let added = 0;
    updateState((current) => {
      const existing = new Set(current.kitchenItems
        .filter((item) => item.section === "Shopping")
        .map((item) => normaliseRecipeIngredient(item.name)));
      const additions = weeklyMissingIngredients
        .filter((ingredient) => {
          const key = normaliseRecipeIngredient(ingredient);
          if (existing.has(key)) return false;
          existing.add(key);
          added += 1;
          return true;
        })
        .map((ingredient) => ({
          id: `weekly-shopping-${crypto.randomUUID()}`,
          name: ingredient,
          checked: false,
          section: "Shopping" as const,
        }));
      return { ...current, kitchenItems: [...current.kitchenItems, ...additions] };
    });
    setShoppingMessage(added
      ? `${added} item${added === 1 ? "" : "s"} added to the shared shopping list.`
      : "Your weekly shopping list is already up to date.");
  };
  const swapDays = (sourceDay: number, targetDay: number) => {
    if (sourceDay === targetDay) return;
    const sourceDate = dates[sourceDay];
    const targetDate = dates[targetDay];
    const sourceMeal = getPlannedMeal(state.mealPlan, sourceDate, sourceDay);
    const targetMeal = getPlannedMeal(state.mealPlan, targetDate, targetDay);
    updateState((current) => ({
      ...current,
      mealPlan: {
        ...current.mealPlan,
        [getMealKey(sourceDate)]: targetMeal,
        [getMealKey(targetDate)]: sourceMeal,
      },
    }));
    setSelectedDay(targetDay);
  };
  const beginDrag = (day: number, event: ReactPointerEvent<HTMLElement>) => {
    dragSourceRef.current = day;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;
    setDragSourceDay(day);
    setDragTargetDay(day);
    dragTargetRef.current = day;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const continueDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragSourceRef.current === null) return;
    const distance = Math.hypot(
      event.clientX - dragStartRef.current.x,
      event.clientY - dragStartRef.current.y,
    );
    if (distance < 8) return;
    didDragRef.current = true;
    setDragPoint({ x: event.clientX, y: event.clientY });
    const target = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-meal-day]");
    const targetDay = target?.dataset.mealDay;
    const nextTarget = targetDay === undefined ? null : Number(targetDay);
    dragTargetRef.current = nextTarget;
    setDragTargetDay(nextTarget);
  };
  const finishDrag = () => {
    const sourceDay = dragSourceRef.current;
    const targetDay = dragTargetRef.current;
    if (didDragRef.current && sourceDay !== null && targetDay !== null && sourceDay !== targetDay) {
      swapDays(sourceDay, targetDay);
    }
    suppressClickRef.current = didDragRef.current;
    dragSourceRef.current = null;
    dragTargetRef.current = null;
    didDragRef.current = false;
    setDragSourceDay(null);
    setDragTargetDay(null);
    setDragPoint(null);
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };
  const changeWeek = (change: number) => {
    setWeekOffset((value) => {
      const next = value + change;
      setSelectedDay(next === 0 ? todayDayIndex : 0);
      return next;
    });
  };

  return {
    repositoryMode, state, dates, selectedDay, setSelectedDay, selectedDate,
    selectedKey, selectedMeal, selectedRecipe, weekLabel, changeWeek,
    sheetMode, setSheetMode, draft, setDraft, openEditor, saveDraft, setMeal,
    shoppingOpen, setShoppingOpen, shoppingMessage, setShoppingMessage,
    weeklyMissingIngredients, addWeekToShopping, diners, setDiners, mealProfiles,
    dragSourceDay, dragTargetDay, dragPoint, suppressClickRef,
    beginDrag, continueDrag, finishDrag, swapDays,
  };
}

export type MealPlannerController = ReturnType<typeof useMealPlannerController>;
