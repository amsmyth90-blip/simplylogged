import { array, exact, record, revision, text } from "./helpers.ts";
import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  type KitchenCookingProgress,
  type KitchenMeal,
  type KitchenPlannedMeal,
  type KitchenPlanningSnapshot,
  type KitchenRecipe,
  type KitchenRecipeDetail,
  type KitchenRecipeSource,
  type KitchenRecipeStep,
} from "./planning-types.ts";

function integer(value: unknown, label: string, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return Number(value);
}

function nullableInteger(value: unknown, label: string, minimum: number, maximum: number) {
  return value === null ? null : integer(value, label, minimum, maximum);
}

function optionalText(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || value.length > maximum) throw new Error(`${label} is invalid.`);
  return value.trim();
}

function date(value: unknown) {
  const candidate = text(value, "Meal date", 10);
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== candidate) {
    throw new Error("Meal date is invalid.");
  }
  return candidate;
}

function safeUrl(value: unknown, label: string, image = false) {
  if (value === null) return null;
  const candidate = optionalText(value, label, 2_048);
  if (!candidate) return "";
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { throw new Error(`${label} is invalid.`); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${label} is invalid.`);
  }
  if (image && parsed.hostname !== "themealdb.com" && parsed.hostname !== "www.themealdb.com") {
    throw new Error(`${label} is not from an approved image service.`);
  }
  return parsed.toString();
}

function step(value: unknown): KitchenRecipeStep {
  const item = record(value, "Recipe step");
  exact(item, ["title", "instruction", "durationMinutes", "temperature", "tip"], "Recipe step");
  return {
    title: text(item.title, "Recipe step title", 120),
    instruction: text(item.instruction, "Recipe step instruction", 2_000),
    durationMinutes: nullableInteger(item.durationMinutes, "Recipe step duration", 0, 1_440),
    temperature: optionalText(item.temperature, "Recipe step temperature", 80),
    tip: optionalText(item.tip, "Recipe step tip", 500),
  };
}

function source(value: unknown): KitchenRecipeSource {
  if (value !== "diarydock" && value !== "scanned" && value !== "themealdb") {
    throw new Error("Recipe source is invalid.");
  }
  return value;
}

export function parseKitchenRecipe(value: unknown): KitchenRecipe {
  const item = record(value, "Recipe");
  exact(item, ["contentComplete", "id", "version", "name", "time", "servings", "image",
    "ingredients", "instructions", "steps", "favourite", "source", "sourceUrl"], "Recipe");
  if (typeof item.contentComplete !== "boolean") throw new Error("Recipe completeness is invalid.");
  if (typeof item.favourite !== "boolean") throw new Error("Recipe favourite status is invalid.");
  const image = safeUrl(item.image || null, "Recipe image", true) ?? "";
  return {
    contentComplete: item.contentComplete,
    id: text(item.id, "Recipe ID", 128),
    version: integer(item.version, "Recipe version", 1, 1_000_000),
    name: text(item.name, "Recipe name", 160),
    time: optionalText(item.time, "Recipe time", 80),
    servings: integer(item.servings, "Recipe servings", 1, 20),
    image,
    ingredients: array(item.ingredients, "Recipe ingredients", 80)
      .map((entry) => text(entry, "Recipe ingredient", 240)),
    instructions: optionalText(item.instructions, "Recipe instructions", 12_000),
    steps: array(item.steps, "Recipe steps", 50).map(step),
    favourite: item.favourite,
    source: source(item.source),
    sourceUrl: safeUrl(item.sourceUrl, "Recipe source URL"),
  };
}

export function parseKitchenMeal(value: unknown): KitchenMeal {
  const item = record(value, "Planned meal");
  exact(item, ["name", "cookTime", "servings", "note", "imageIndex", "recipeId"], "Planned meal");
  return {
    name: text(item.name, "Meal name", 160),
    cookTime: optionalText(item.cookTime, "Meal cooking time", 80),
    servings: integer(item.servings, "Meal servings", 1, 20),
    note: optionalText(item.note, "Meal note", 2_000),
    imageIndex: integer(item.imageIndex, "Meal image", 0, 6),
    recipeId: item.recipeId === null ? null : text(item.recipeId, "Meal recipe ID", 128),
  };
}

function plannedMeal(value: unknown): KitchenPlannedMeal {
  const item = record(value, "Meal-plan entry");
  exact(item, ["date", "meal"], "Meal-plan entry");
  return { date: date(item.date), meal: item.meal === null ? null : parseKitchenMeal(item.meal) };
}

export function parseKitchenCookingProgress(value: unknown): KitchenCookingProgress {
  const item = record(value, "Cooking progress");
  exact(item, ["recipeId", "stepIndex", "servings", "timerRemainingSeconds", "timerEndsAt",
    "updatedAt"], "Cooking progress");
  const updatedAt = text(item.updatedAt, "Cooking progress time", 40);
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error("Cooking progress time is invalid.");
  return {
    recipeId: text(item.recipeId, "Cooking recipe ID", 128),
    stepIndex: integer(item.stepIndex, "Cooking step", 0, 49),
    servings: integer(item.servings, "Cooking servings", 1, 20),
    timerRemainingSeconds: integer(item.timerRemainingSeconds, "Cooking timer", 0, 172_800),
    timerEndsAt: nullableInteger(item.timerEndsAt, "Cooking timer end", 0, 9_007_199_254_740_991),
    updatedAt,
  };
}

export function parseKitchenPlanningSnapshot(value: unknown): KitchenPlanningSnapshot {
  const snapshot = record(value, "Kitchen planning snapshot");
  exact(snapshot, ["schemaVersion", "revision", "recipes", "meals", "cookingProgress"],
    "Kitchen planning snapshot");
  if (snapshot.schemaVersion !== KITCHEN_PLANNING_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Kitchen planning.");
  }
  const meals = array(snapshot.meals, "Meal plan", 730).map(plannedMeal);
  if (new Set(meals.map((entry) => entry.date)).size !== meals.length) {
    throw new Error("Meal plan contains duplicate dates.");
  }
  return {
    schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
    revision: revision(snapshot.revision),
    recipes: array(snapshot.recipes, "Recipes", 150).map(parseKitchenRecipe),
    meals,
    cookingProgress: snapshot.cookingProgress === null
      ? null : parseKitchenCookingProgress(snapshot.cookingProgress),
  };
}

export function parseKitchenRecipeDetail(value: unknown): KitchenRecipeDetail {
  const detail = record(value, "Kitchen recipe detail");
  exact(detail, ["schemaVersion", "revision", "recipe"], "Kitchen recipe detail");
  if (detail.schemaVersion !== KITCHEN_PLANNING_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this recipe.");
  }
  const recipe = parseKitchenRecipe(detail.recipe);
  if (!recipe.contentComplete) {
    throw new Error("Kitchen recipe detail is incomplete.");
  }
  return {
    schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
    revision: revision(detail.revision),
    recipe,
  };
}

export { date as parseKitchenMealDate, integer as parseKitchenInteger };
