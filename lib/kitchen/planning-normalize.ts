import {
  parseKitchenCookingProgress,
  parseKitchenMeal,
  parseKitchenMealDate,
  parseKitchenRecipe,
  type KitchenCookingProgress,
  type KitchenMeal,
  type KitchenPlannedMeal,
  type KitchenRecipe,
  type KitchenRecipeStep,
} from "@diarydock/kitchen";

export type JsonRecord = Record<string, unknown>;

export function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown, minimum: number, maximum: number, fallback: number) {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value) : fallback;
}

function safeUrl(value: unknown, image = false) {
  const candidate = cleanText(value, 2_048);
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    const approvedImage = !image || parsed.hostname === "themealdb.com"
      || parsed.hostname === "www.themealdb.com";
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && approvedImage
      ? parsed.toString() : "";
  } catch { return ""; }
}

function normaliseStep(value: unknown): KitchenRecipeStep | null {
  const entry = object(value);
  const title = cleanText(entry.title, 120);
  const instruction = cleanText(entry.instruction, 2_000);
  if (!title || !instruction) return null;
  return {
    title,
    instruction,
    durationMinutes: Number.isSafeInteger(entry.durationMinutes)
      && Number(entry.durationMinutes) >= 0 && Number(entry.durationMinutes) <= 1_440
      ? Number(entry.durationMinutes) : null,
    temperature: cleanText(entry.temperature, 80),
    tip: cleanText(entry.tip, 500),
  };
}

export function normaliseRecipe(value: unknown): KitchenRecipe | null {
  const entry = object(value);
  const id = cleanText(entry.id, 128);
  const name = cleanText(entry.name, 160);
  if (!id || !name) return null;
  const source = entry.source === "scanned" || entry.source === "themealdb"
    ? entry.source : "diarydock";
  try {
    return parseKitchenRecipe({
      contentComplete: true,
      id,
      version: integer(entry.version, 1, 1_000_000, 1),
      name,
      time: cleanText(entry.time, 80),
      servings: integer(entry.servings, 1, 20, 4),
      image: safeUrl(entry.image, true),
      ingredients: (Array.isArray(entry.ingredients) ? entry.ingredients : []).slice(0, 80)
        .map((item) => cleanText(item, 240)).filter(Boolean),
      instructions: cleanText(entry.instructions, 12_000),
      steps: (Array.isArray(entry.steps) ? entry.steps : []).slice(0, 50)
        .map(normaliseStep).filter((item): item is KitchenRecipeStep => Boolean(item)),
      favourite: entry.favourite === true,
      source,
      sourceUrl: safeUrl(entry.sourceUrl) || null,
    });
  } catch { return null; }
}

export function normaliseRecipes(value: unknown) {
  if (!Array.isArray(value)) return [];
  const recipes: KitchenRecipe[] = [];
  const ids = new Set<string>();
  for (const candidate of value.slice(0, 150)) {
    const recipe = normaliseRecipe(candidate);
    if (recipe && !ids.has(recipe.id)) {
      ids.add(recipe.id);
      recipes.push(recipe);
    }
  }
  return recipes;
}

export function normaliseMeal(value: unknown): KitchenMeal | null {
  const entry = object(value);
  if (!cleanText(entry.name, 160)) return null;
  try {
    return parseKitchenMeal({
      name: cleanText(entry.name, 160),
      cookTime: cleanText(entry.cookTime, 80),
      servings: integer(entry.servings, 1, 20, 4),
      note: cleanText(entry.note, 2_000),
      imageIndex: integer(entry.imageIndex, 0, 6, 0),
      recipeId: cleanText(entry.recipeId, 128) || null,
    });
  } catch { return null; }
}

export function normaliseMealPlan(value: unknown, today = new Date()) {
  const source = object(value);
  const entries: KitchenPlannedMeal[] = [];
  for (const [date, raw] of Object.entries(source)) {
    try {
      const safeDate = parseKitchenMealDate(date);
      if (raw === null) entries.push({ date: safeDate, meal: null });
      else {
        const meal = normaliseMeal(raw);
        if (meal) entries.push({ date: safeDate, meal });
      }
    } catch { /* Malformed legacy dates are omitted from the mobile projection. */ }
  }
  const todayTime = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return entries.sort((left, right) => {
    const leftDistance = Math.abs(Date.parse(`${left.date}T00:00:00Z`) - todayTime);
    const rightDistance = Math.abs(Date.parse(`${right.date}T00:00:00Z`) - todayTime);
    return leftDistance - rightDistance || left.date.localeCompare(right.date);
  }).slice(0, 730).sort((left, right) => left.date.localeCompare(right.date));
}

export function normaliseCookingProgress(
  value: unknown,
  recipeIds: ReadonlySet<string>,
): KitchenCookingProgress | null {
  try {
    const progress = parseKitchenCookingProgress(value);
    return recipeIds.has(progress.recipeId) ? progress : null;
  } catch { return null; }
}
