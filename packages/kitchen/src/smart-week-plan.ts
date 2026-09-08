import type { KitchenMeal, KitchenPlannedMeal, KitchenRecipe } from "./planning-types.ts";

export type SmartPlanFocus = "QUICK" | "USE_UP" | "FAVOURITES" | "VARIETY";

export type SmartPlanRequest = {
  dates: string[];
  servings: number;
  maximumMinutes: number | null;
  focus: SmartPlanFocus;
  useUp: string[];
  skip: string[];
  appliances: string[];
  shops: string[];
  rotation: number;
};

function words(values: string[]) {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 12);
}

function minutes(value: string) {
  const lower = value.toLowerCase();
  let total = 0;
  let index = 0;
  while (index < value.length) {
    while (index < value.length) {
      const code = value.charCodeAt(index);
      if (code >= 48 && code <= 57) break;
      index += 1;
    }
    const numberStart = index;
    while (index < value.length) {
      const code = value.charCodeAt(index);
      if (code < 48 || code > 57) break;
      index += 1;
    }
    if (numberStart === index) break;
    const amount = Number(value.slice(numberStart, index));
    while (value[index] === " ") index += 1;
    const unitStart = index;
    while (index < value.length) {
      const code = lower.charCodeAt(index);
      if (code < 97 || code > 122) break;
      index += 1;
    }
    const unit = lower.slice(unitStart, index);
    if (unit.startsWith("h")) total += amount * 60;
    else if (unit.startsWith("m")) total += amount;
  }
  return Number.isFinite(total) && total > 0 ? total : null;
}

function searchable(recipe: KitchenRecipe) {
  return `${recipe.name} ${recipe.ingredients.join(" ")}`.toLowerCase();
}

function score(recipe: KitchenRecipe, request: SmartPlanRequest) {
  const searchableRecipe = searchable(recipe);
  const useUpMatches = words(request.useUp)
    .filter((term) => searchableRecipe.includes(term)).length;
  const duration = minutes(recipe.time);
  let value = useUpMatches * (request.focus === "USE_UP" ? 30 : 12);
  if (recipe.favourite) value += request.focus === "FAVOURITES" ? 35 : 8;
  if (request.focus === "QUICK" && duration) value += Math.max(0, 60 - duration);
  if (request.focus === "VARIETY") value += Math.min(12, recipe.ingredients.length);
  value += words(request.appliances)
    .filter((appliance) => searchableRecipe.includes(appliance)).length * 15;
  return value;
}

function meal(recipe: KitchenRecipe, servings: number, imageIndex: number): KitchenMeal {
  return {
    name: recipe.name,
    cookTime: recipe.time,
    servings,
    note: recipe.instructions.slice(0, 2_000),
    imageIndex: imageIndex % 7,
    recipeId: recipe.id,
  };
}

export function buildSmartWeekPlan(recipes: KitchenRecipe[], request: SmartPlanRequest) {
  const skipped = words(request.skip);
  const eligible = recipes.filter((recipe) => {
    const content = searchable(recipe);
    const duration = minutes(recipe.time);
    return !skipped.some((term) => content.includes(term))
      && (!request.maximumMinutes || !duration || duration <= request.maximumMinutes);
  });
  if (!eligible.length || !request.dates.length) return [];
  const ranked = eligible.map((recipe, index) => ({ recipe, index,
    score: score(recipe, request) })).sort((a, b) => b.score - a.score
      || a.index - b.index);
  const rotated = ranked.map((_, index) => ranked[(index + request.rotation) % ranked.length]!);
  return request.dates.slice(0, 7).map((date, index): KitchenPlannedMeal => ({
    date,
    meal: meal(rotated[index % rotated.length]!.recipe, request.servings, index),
  }));
}
