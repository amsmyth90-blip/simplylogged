import type { KitchenMeal, KitchenRecipe } from "./planning-types.ts";

export const defaultKitchenMeals: readonly KitchenMeal[] = [
  { name: "Lemon herb salmon", cookTime: "35 min", servings: 3,
    note: "Seasonal vegetables and baby potatoes.", imageIndex: 0, recipeId: "salmon" },
  { name: "Garden pasta", cookTime: "25 min", servings: 3,
    note: "Fresh vegetables, herbs and parmesan.", imageIndex: 1, recipeId: "pasta" },
  { name: "Chicken traybake", cookTime: "45 min", servings: 4,
    note: "Roasted vegetables and herby potatoes.", imageIndex: 2, recipeId: null },
  { name: "Tacos", cookTime: "30 min", servings: 4,
    note: "Salsa, avocado and crunchy slaw.", imageIndex: 3, recipeId: null },
  { name: "Vegetable curry", cookTime: "35 min", servings: 4,
    note: "Chickpeas, spinach and steamed rice.", imageIndex: 4, recipeId: "curry" },
  { name: "Homemade pizza", cookTime: "40 min", servings: 4,
    note: "Garden vegetables and fresh basil.", imageIndex: 5, recipeId: null },
  { name: "Sunday roast", cookTime: "1 hr 30", servings: 4,
    note: "Roast potatoes, vegetables and gravy.", imageIndex: 6, recipeId: "roast" },
];

export function defaultKitchenMealForDate(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return structuredClone(defaultKitchenMeals[day === 0 ? 6 : day - 1]!);
}

function scaledQuantity(value: number) {
  const rounded = Math.round(value * 4) / 4;
  if (Number.isInteger(rounded)) return String(rounded);
  const whole = Math.floor(rounded);
  const fraction = Math.round((rounded - whole) * 4);
  const label = fraction === 1 ? "¼" : fraction === 2 ? "½" : fraction === 3 ? "¾" : "";
  return whole > 0 ? `${whole}${label}` : label || String(rounded);
}

export function scaleKitchenRecipeIngredient(
  ingredient: string,
  originalServings: number,
  servings: number,
) {
  if (servings === originalServings || originalServings < 1) return ingredient;
  const match = ingredient.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return ingredient;
  return `${scaledQuantity(Number(match[1]) * (servings / originalServings))}${match[2]}`;
}

export function normaliseKitchenRecipeIngredient(ingredient: string) {
  return ingredient.toLowerCase()
    .replace(/[¼½¾]/g, "")
    .replace(/^\d+(?:\.\d+)?\s*(?:x\s*)?/i, "")
    .replace(/^\d+(?:\.\d+)?\s*/i, "")
    .replace(/^(?:g|kg|ml|l|tbsp|tsp|tablespoons?|teaspoons?|cloves?|tins?|cans?)\s+/i, "")
    .replace(/\b(?:fresh|chopped|finely|roughly|large|small|medium)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function getKitchenRecipeSteps(recipe: KitchenRecipe) {
  if (recipe.steps.length) return recipe.steps;
  const instructions = recipe.instructions.replace(/\r?\n+/g, "|")
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1|").split("|")
    .map((item) => item.trim()).filter((item) => item.length > 3);
  const steps = instructions.map((instruction, index) => ({
    title: index === 0 ? "Prepare"
      : index === instructions.length - 1 ? "Finish and serve" : `Cook · stage ${index}`,
    instruction,
    durationMinutes: null,
    temperature: "",
    tip: "",
  }));
  return steps.length ? steps : [{ title: "Follow the recipe",
    instruction: "Review the ingredients and add cooking instructions when you edit this recipe.",
    durationMinutes: null, temperature: "", tip: "" }];
}
