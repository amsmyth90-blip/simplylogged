import { array, exact, record, revision, text } from "./helpers.ts";
import {
  parseKitchenCookingProgress,
  parseKitchenInteger,
  parseKitchenMeal,
  parseKitchenMealDate,
  parseKitchenRecipe,
} from "./planning-parser.ts";
import type { KitchenPlanningMutation } from "./planning-types.ts";

function base(value: unknown) {
  const mutation = record(value, "Kitchen planning update");
  const operation = mutation.operation;
  const parsedRevision = revision(mutation.revision);
  return { mutation, operation, revision: parsedRevision };
}

export function parseKitchenPlanningMutation(value: unknown): KitchenPlanningMutation {
  const { mutation, operation, revision: parsedRevision } = base(value);
  if (operation === "SAVE_RECIPE") {
    exact(mutation, ["operation", "revision", "recipe"], "Kitchen planning update");
    const recipe = parseKitchenRecipe(mutation.recipe);
    if (!recipe.contentComplete) throw new Error("A reduced offline recipe cannot be saved.");
    return { operation, revision: parsedRevision, recipe };
  }
  if (operation === "DELETE_RECIPE" || operation === "TOGGLE_RECIPE_FAVOURITE") {
    exact(mutation, ["operation", "revision", "recipeId"], "Kitchen planning update");
    return {
      operation,
      revision: parsedRevision,
      recipeId: text(mutation.recipeId, "Recipe ID", 128),
    };
  }
  if (operation === "SET_MEAL") {
    exact(mutation, ["operation", "revision", "date", "meal"], "Kitchen planning update");
    return {
      operation,
      revision: parsedRevision,
      date: parseKitchenMealDate(mutation.date),
      meal: mutation.meal === null ? null : parseKitchenMeal(mutation.meal),
    };
  }
  if (operation === "SWAP_MEALS") {
    exact(mutation, ["operation", "revision", "sourceDate", "targetDate"], "Kitchen planning update");
    const sourceDate = parseKitchenMealDate(mutation.sourceDate);
    const targetDate = parseKitchenMealDate(mutation.targetDate);
    if (sourceDate === targetDate) throw new Error("Meal swap dates must be different.");
    return { operation, revision: parsedRevision, sourceDate, targetDate };
  }
  if (operation === "SET_COOKING_PROGRESS") {
    exact(mutation, ["operation", "revision", "progress"], "Kitchen planning update");
    return {
      operation,
      revision: parsedRevision,
      progress: mutation.progress === null ? null : parseKitchenCookingProgress(mutation.progress),
    };
  }
  if (operation === "ADD_RECIPE_INGREDIENTS_TO_SHOPPING") {
    exact(mutation, ["operation", "revision", "recipeId", "servings", "ingredientIndexes"],
      "Kitchen planning update");
    const ingredientIndexes = array(mutation.ingredientIndexes, "Recipe ingredient selection", 80)
      .map((entry) => parseKitchenInteger(entry, "Recipe ingredient index", 0, 79));
    if (new Set(ingredientIndexes).size !== ingredientIndexes.length) {
      throw new Error("Recipe ingredient selection contains duplicates.");
    }
    return {
      operation,
      revision: parsedRevision,
      recipeId: text(mutation.recipeId, "Recipe ID", 128),
      servings: parseKitchenInteger(mutation.servings, "Recipe servings", 1, 20),
      ingredientIndexes,
    };
  }
  if (operation === "ADD_WEEK_TO_SHOPPING") {
    exact(mutation, ["operation", "revision", "dates"], "Kitchen planning update");
    const dates = array(mutation.dates, "Meal-plan week", 7).map(parseKitchenMealDate);
    const consecutive = dates.every((date, index) => index === 0
      || Date.parse(`${date}T00:00:00Z`) - Date.parse(`${dates[index - 1]}T00:00:00Z`) === 86_400_000);
    if (dates.length !== 7 || new Set(dates).size !== dates.length
      || new Date(`${dates[0]}T00:00:00Z`).getUTCDay() !== 1 || !consecutive) {
      throw new Error("Meal-plan week is invalid.");
    }
    return { operation, revision: parsedRevision, dates };
  }
  throw new Error("Kitchen planning update operation is invalid.");
}
