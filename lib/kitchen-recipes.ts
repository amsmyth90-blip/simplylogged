export type KitchenRecipeStep = {
  title: string;
  instruction: string;
  durationMinutes?: number;
  temperature?: string;
  tip?: string;
};

export type KitchenRecipe = {
  id: string;
  version?: number;
  name: string;
  time: string;
  servings?: number;
  image: string;
  ingredients: string[];
  instructions: string;
  steps?: KitchenRecipeStep[];
  favourite?: boolean;
  source: "diarydock" | "scanned" | "themealdb";
  sourceUrl?: string;
};

export type KitchenCookingProgress = {
  recipeId: string;
  stepIndex: number;
  servings: number;
  timerRemainingSeconds: number;
  timerEndsAt: number | null;
  updatedAt: string;
};

function formatScaledQuantity(value: number) {
  const rounded = Math.round(value * 4) / 4;
  if (Number.isInteger(rounded)) return String(rounded);
  const whole = Math.floor(rounded);
  const fraction = Math.round((rounded - whole) * 4);
  const fractionLabel = fraction === 1 ? "¼" : fraction === 2 ? "½" : fraction === 3 ? "¾" : "";
  return whole > 0 ? `${whole}${fractionLabel}` : fractionLabel || String(rounded);
}

export function scaleRecipeIngredient(ingredient: string, originalServings: number, servings: number) {
  if (servings === originalServings || originalServings < 1) return ingredient;
  const quantityMatch = ingredient.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!quantityMatch) return ingredient;
  const scaled = Number(quantityMatch[1]) * (servings / originalServings);
  return `${formatScaledQuantity(scaled)}${quantityMatch[2]}`;
}

export function normaliseRecipeIngredient(ingredient: string) {
  return ingredient
    .toLowerCase()
    .replace(/[¼½¾]/g, "")
    .replace(/^\d+(?:\.\d+)?\s*(?:x\s*)?/i, "")
    .replace(/^\d+(?:\.\d+)?\s*/i, "")
    .replace(/^(?:g|kg|ml|l|tbsp|tsp|tablespoons?|teaspoons?|cloves?|tins?|cans?)\s+/i, "")
    .replace(/\b(?:fresh|chopped|finely|roughly|large|small|medium)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getKitchenRecipeSteps(recipe: KitchenRecipe): KitchenRecipeStep[] {
  if (recipe.steps?.length) return recipe.steps;

  const sentences = recipe.instructions
    .replace(/\r?\n+/g, "|")
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1|")
    .split("|")
    .map((step) => step.trim())
    .filter((step) => step.length > 3);

  return sentences.map((instruction, index) => {
    const minuteMatch = instruction.match(/(\d+)(?:\s*-\s*(\d+))?\s*(?:minutes?|mins?)/i);
    const temperatureMatch = instruction.match(/(?:\d{2,3}\s*°?\s*C(?:\s*\/\s*\d{2,3}\s*°?\s*C\s*fan)?|gas\s*mark\s*\d+|(?:low|medium(?:-high|-low)?|high)\s+heat)/i);

    return {
      title: index === 0 ? "Prepare" : index === sentences.length - 1 ? "Finish and serve" : `Cook · stage ${index}`,
      instruction,
      durationMinutes: minuteMatch ? Number(minuteMatch[2] || minuteMatch[1]) : undefined,
      temperature: temperatureMatch?.[0],
    };
  });
}

export const starterKitchenRecipes: KitchenRecipe[] = [];
