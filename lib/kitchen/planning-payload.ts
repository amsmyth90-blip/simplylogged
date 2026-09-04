import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  parseKitchenPlanningSnapshot,
  type KitchenMeal,
  type KitchenPlanningSnapshot,
  type KitchenRecipe,
  type KitchenRecipeStep,
} from "@diarydock/kitchen";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";
import {
  normaliseCookingProgress,
  normaliseMealPlan,
  normaliseRecipes,
  object,
} from "./planning-normalize.ts";

const SNAPSHOT_LIMIT = 480 * 1024;

function appendWithin<T>(target: T[], item: T, size: number) {
  const delta = jsonUtf8Bytes(item) + (target.length ? 1 : 0);
  if (size + delta > SNAPSHOT_LIMIT) return { added: false, size };
  target.push(item);
  return { added: true, size: size + delta };
}

function fitRecipes(source: KitchenRecipe[], meals: Array<{ date: string; meal: KitchenMeal | null }>,
  revision: string | null, progress: unknown) {
  const recipes = source.map((recipe) => ({
    ...recipe, contentComplete: false, image: "", ingredients: [] as string[], instructions: "",
    steps: [] as KitchenRecipeStep[], sourceUrl: null as string | null,
  }));
  const snapshot = { schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION, revision, recipes, meals,
    cookingProgress: progress };
  let size = jsonUtf8Bytes(snapshot);
  if (size > SNAPSHOT_LIMIT) throw new Error("Kitchen planning exceeds the safe mobile record limit.");

  for (let round = 0; round < 80; round += 1) {
    for (let index = 0; index < source.length; index += 1) {
      const ingredient = source[index]!.ingredients[round];
      if (ingredient) size = appendWithin(recipes[index]!.ingredients, ingredient, size).size;
    }
  }
  let offset = 0;
  let copied = true;
  while (copied) {
    copied = false;
    for (let index = 0; index < source.length; index += 1) {
      const chunk = source[index]!.instructions.slice(offset, offset + 128);
      if (!chunk) continue;
      const current = recipes[index]!.instructions;
      const delta = jsonUtf8Bytes(current + chunk) - jsonUtf8Bytes(current);
      if (size + delta <= SNAPSHOT_LIMIT) {
        recipes[index]!.instructions += chunk;
        size += delta;
        copied = true;
      }
    }
    offset += 128;
  }
  for (let round = 0; round < 50; round += 1) {
    for (let index = 0; index < source.length; index += 1) {
      const step = source[index]!.steps[round];
      if (step) size = appendWithin(recipes[index]!.steps, step, size).size;
    }
  }
  for (let index = 0; index < source.length; index += 1) {
    for (const field of ["image", "sourceUrl"] as const) {
      const candidate = source[index]![field];
      if (!candidate) continue;
      const current = recipes[index]![field];
      const delta = jsonUtf8Bytes(candidate) - jsonUtf8Bytes(current);
      if (size + delta <= SNAPSHOT_LIMIT) {
        recipes[index]![field] = candidate;
        size += delta;
      }
    }
    recipes[index]!.contentComplete = recipes[index]!.ingredients.length
      === source[index]!.ingredients.length
      && recipes[index]!.instructions === source[index]!.instructions
      && recipes[index]!.steps.length === source[index]!.steps.length;
  }
  return recipes;
}

function fitMealNotes(meals: Array<{ date: string; meal: KitchenMeal | null }>, base: unknown) {
  const fitted = meals.map((entry) => ({ ...entry,
    meal: entry.meal ? { ...entry.meal, note: "" } : null }));
  let size = jsonUtf8Bytes({ ...object(base), meals: fitted });
  let offset = 0;
  let copied = true;
  while (copied) {
    copied = false;
    for (let index = 0; index < meals.length; index += 1) {
      const source = meals[index]!.meal?.note ?? "";
      const target = fitted[index]!.meal;
      const chunk = source.slice(offset, offset + 64);
      if (!target || !chunk) continue;
      const delta = jsonUtf8Bytes(target.note + chunk) - jsonUtf8Bytes(target.note);
      if (size + delta <= SNAPSHOT_LIMIT) {
        target.note += chunk;
        size += delta;
        copied = true;
      }
    }
    offset += 64;
  }
  return fitted;
}

export function projectKitchenPlanningSnapshot(
  payload: unknown,
  revision: string | null,
  today = new Date(),
): KitchenPlanningSnapshot {
  const state = object(payload);
  const sourceRecipes = normaliseRecipes(state.kitchenRecipes);
  const recipeIds = new Set(sourceRecipes.map((recipe) => recipe.id));
  const meals = normaliseMealPlan(state.mealPlan, today);
  const cookingProgress = normaliseCookingProgress(state.kitchenCookingProgress, recipeIds);
  const skeleton = { schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION, revision,
    recipes: sourceRecipes.map((recipe) => ({ ...recipe, contentComplete: false,
      image: "", ingredients: [],
      instructions: "", steps: [], sourceUrl: null })), cookingProgress };
  const fittedMeals = fitMealNotes(meals, skeleton);
  const recipes = fitRecipes(sourceRecipes, fittedMeals, revision, cookingProgress);
  return parseKitchenPlanningSnapshot({ ...skeleton, recipes, meals: fittedMeals });
}

export { mutateKitchenPlanningPayload } from "./planning-mutation.ts";
