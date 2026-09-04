import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  defaultKitchenMealForDate,
  normaliseKitchenRecipeIngredient,
  scaleKitchenRecipeIngredient,
  type KitchenMeal,
  type KitchenPlanningMutation,
  type KitchenRecipe,
} from "@diarydock/kitchen";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";
import {
  normaliseCookingProgress,
  normaliseMeal,
  normaliseMealPlan,
  normaliseRecipe,
  normaliseRecipes,
  object,
  type JsonRecord,
} from "./planning-normalize.ts";

type Status = "OK" | "CAPACITY" | "NOT_FOUND" | "INVALID_REFERENCE";
export type KitchenPlanningMutationResult = {
  status: Status;
  payload: JsonRecord | null;
  addedCount: number;
};

function result(status: Status, payload: JsonRecord | null = null, addedCount = 0) {
  return { status, payload, addedCount };
}

function withinServiceCapacity(payload: JsonRecord) {
  const recipes = normaliseRecipes(payload.kitchenRecipes);
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  return jsonUtf8Bytes({
    schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
    revision: null,
    recipes,
    meals: normaliseMealPlan(payload.mealPlan),
    cookingProgress: normaliseCookingProgress(payload.kitchenCookingProgress, recipeIds),
  }) <= 1_500_000;
}

function bounded(candidate: KitchenPlanningMutationResult) {
  return candidate.status === "OK" && candidate.payload && !withinServiceCapacity(candidate.payload)
    ? result("CAPACITY") : candidate;
}

function recipeIndex(source: unknown[], recipeId: string) {
  return source.slice(0, 150).findIndex((entry) => normaliseRecipe(entry)?.id === recipeId);
}

function activeRecipe(recipes: KitchenRecipe[], recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId) ?? null;
}

function mealForDate(plan: JsonRecord, date: string): KitchenMeal | null {
  if (!Object.prototype.hasOwnProperty.call(plan, date)) return defaultKitchenMealForDate(date);
  if (plan[date] === null) return null;
  return normaliseMeal(plan[date]) ?? null;
}

function saveRecipe(payload: JsonRecord, mutation: Extract<KitchenPlanningMutation,
  { operation: "SAVE_RECIPE" }>) {
  const source = Array.isArray(payload.kitchenRecipes) ? [...payload.kitchenRecipes] : [];
  const index = recipeIndex(source, mutation.recipe.id);
  if (index < 0 && normaliseRecipes(source).length >= 150) return result("CAPACITY");
  const previous = index >= 0 ? object(source[index]) : {};
  const next = { ...mutation.recipe,
    version: index >= 0 ? Math.min(1_000_000, Math.max(
      Number.isSafeInteger(previous.version) ? Number(previous.version) + 1 : 1,
      mutation.recipe.version,
    )) : mutation.recipe.version };
  if (index >= 0) source[index] = next;
  else source.unshift(next);
  payload.kitchenRecipes = source;
  return result("OK", payload);
}

function changeRecipe(payload: JsonRecord, recipeId: string, remove: boolean) {
  const source = Array.isArray(payload.kitchenRecipes) ? [...payload.kitchenRecipes] : [];
  const index = recipeIndex(source, recipeId);
  if (index < 0) return result("NOT_FOUND");
  if (remove && normaliseRecipes(source).length <= 1) return result("INVALID_REFERENCE");
  if (remove) {
    source.splice(index, 1);
    if (object(payload.kitchenCookingProgress).recipeId === recipeId) {
      payload.kitchenCookingProgress = null;
    }
  } else {
    const recipe = object(source[index]);
    source[index] = { ...recipe, favourite: recipe.favourite !== true };
  }
  payload.kitchenRecipes = source;
  return result("OK", payload);
}

function setMeal(payload: JsonRecord, date: string, meal: KitchenMeal | null,
  recipes: KitchenRecipe[]) {
  if (meal?.recipeId && !activeRecipe(recipes, meal.recipeId)) return result("INVALID_REFERENCE");
  payload.mealPlan = { ...object(payload.mealPlan), [date]: meal };
  return result("OK", payload);
}

function swapMeals(payload: JsonRecord, sourceDate: string, targetDate: string) {
  const plan = object(payload.mealPlan);
  const source = mealForDate(plan, sourceDate);
  const target = mealForDate(plan, targetDate);
  payload.mealPlan = { ...plan, [sourceDate]: target, [targetDate]: source };
  return result("OK", payload);
}

function validKitchenItems(value: unknown) {
  return (Array.isArray(value) ? value : []).filter((entry) => {
    const item = object(entry);
    return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 128
      && typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 120
      && (item.section === "Pantry" || item.section === "Shopping");
  });
}

function appendShopping(payload: JsonRecord, ingredients: string[], createId: () => string) {
  const raw = Array.isArray(payload.kitchenItems) ? [...payload.kitchenItems] : [];
  const valid = validKitchenItems(raw);
  const existing = new Set(valid.filter((entry) => object(entry).section === "Shopping")
    .map((entry) => normaliseKitchenRecipeIngredient(String(object(entry).name))).filter(Boolean));
  const additions: JsonRecord[] = [];
  for (const ingredient of ingredients) {
    const key = normaliseKitchenRecipeIngredient(ingredient);
    if (!key || existing.has(key)) continue;
    existing.add(key);
    additions.push({ id: `shopping-${createId()}`, name: ingredient,
      checked: false, section: "Shopping" });
  }
  if (valid.length + additions.length > 300) return result("CAPACITY");
  payload.kitchenItems = [...raw, ...additions];
  return result("OK", payload, additions.length);
}

function selectedIngredients(recipe: KitchenRecipe, servings: number, indexes: number[]) {
  const ingredients: string[] = [];
  for (const index of indexes) {
    const ingredient = recipe.ingredients[index];
    if (!ingredient) return null;
    ingredients.push(scaleKitchenRecipeIngredient(ingredient, recipe.servings, servings));
  }
  return ingredients;
}

function weekIngredients(payload: JsonRecord, recipes: KitchenRecipe[], dates: string[]) {
  const plan = object(payload.mealPlan);
  const pantry = validKitchenItems(payload.kitchenItems)
    .filter((entry) => object(entry).section === "Pantry" && object(entry).checked === true)
    .map((entry) => normaliseKitchenRecipeIngredient(String(object(entry).name))).filter(Boolean);
  const ingredients: string[] = [];
  for (const date of dates) {
    const meal = mealForDate(plan, date);
    const recipe = meal?.recipeId ? activeRecipe(recipes, meal.recipeId) : null;
    if (!meal || !recipe) continue;
    for (const ingredient of recipe.ingredients) {
      const scaled = scaleKitchenRecipeIngredient(ingredient, recipe.servings, meal.servings);
      const key = normaliseKitchenRecipeIngredient(scaled);
      if (key && !pantry.some((item) => item === key || item.includes(key) || key.includes(item))) {
        ingredients.push(scaled);
      }
    }
  }
  return ingredients;
}

export function mutateKitchenPlanningPayload(
  current: unknown,
  mutation: KitchenPlanningMutation,
  createId: () => string = () => crypto.randomUUID(),
): KitchenPlanningMutationResult {
  const payload = structuredClone(object(current));
  const recipes = normaliseRecipes(payload.kitchenRecipes);
  if (mutation.operation === "SAVE_RECIPE") return bounded(saveRecipe(payload, mutation));
  if (mutation.operation === "DELETE_RECIPE") return changeRecipe(payload, mutation.recipeId, true);
  if (mutation.operation === "TOGGLE_RECIPE_FAVOURITE") {
    return changeRecipe(payload, mutation.recipeId, false);
  }
  if (mutation.operation === "SET_MEAL") {
    return bounded(setMeal(payload, mutation.date, mutation.meal, recipes));
  }
  if (mutation.operation === "SWAP_MEALS") {
    return bounded(swapMeals(payload, mutation.sourceDate, mutation.targetDate));
  }
  if (mutation.operation === "SET_COOKING_PROGRESS") {
    if (mutation.progress) {
      const recipe = activeRecipe(recipes, mutation.progress.recipeId);
      if (!recipe || mutation.progress.stepIndex >= Math.max(1, recipe.steps.length)) {
        return result("INVALID_REFERENCE");
      }
    }
    payload.kitchenCookingProgress = mutation.progress;
    return bounded(result("OK", payload));
  }
  if (mutation.operation === "ADD_RECIPE_INGREDIENTS_TO_SHOPPING") {
    const recipe = activeRecipe(recipes, mutation.recipeId);
    if (!recipe) return result("NOT_FOUND");
    const ingredients = selectedIngredients(recipe, mutation.servings, mutation.ingredientIndexes);
    return ingredients ? bounded(appendShopping(payload, ingredients, createId))
      : result("INVALID_REFERENCE");
  }
  return bounded(appendShopping(payload, weekIngredients(payload, recipes, mutation.dates), createId));
}
