export type MealDbMeal = Record<string, string | null>;

function clean(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function mealId(value: unknown) {
  return clean(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}

function titleKey(value: unknown) {
  return clean(value, 160).normalize("NFKC").toLocaleLowerCase("en-GB")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function slug(value: unknown) {
  return titleKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function mealDbRecipeUrl(meal: MealDbMeal) {
  const id = mealId(meal.idMeal);
  const name = slug(meal.strMeal);
  return id && name ? `https://www.themealdb.com/meal/${id}-${name}-recipe` : null;
}

export function exactMealDbMatch(value: unknown, expectedTitle: string): MealDbMeal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const meals = (value as Record<string, unknown>).meals;
  if (!Array.isArray(meals)) return null;
  const expected = titleKey(expectedTitle);
  for (const candidate of meals.slice(0, 50)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const meal: MealDbMeal = {};
    for (const [key, item] of Object.entries(candidate)) {
      if (typeof item === "string" || item === null) meal[key.slice(0, 80)] = item;
    }
    if (mealId(meal.idMeal) && titleKey(meal.strMeal) === expected) return meal;
  }
  return null;
}
