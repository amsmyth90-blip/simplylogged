import type { CSSProperties } from "react";

import type { KitchenRecipe } from "@/lib/kitchen-recipes";

export type RecipeEditDraft = {
  name: string;
  time: string;
  servings: number;
  ingredients: string;
  instructions: string;
};

export const emptyRecipe: KitchenRecipe = {
  id: "empty-recipe-book",
  name: "Your recipe book",
  time: "",
  servings: 4,
  ingredients: [],
  instructions: "",
  image: "",
  source: "diarydock"
};

export function mealImageStyle(image: string): CSSProperties {
  return {
    backgroundImage: image
      ? `url('${image}')`
      : "linear-gradient(145deg,#dfe9da,#f4eee2)",
    backgroundPosition: "center",
    backgroundSize: "cover"
  };
}

export function draftForRecipe(recipe: KitchenRecipe): RecipeEditDraft {
  return {
    name: recipe.name,
    time: recipe.time,
    servings: recipe.servings ?? 4,
    ingredients: recipe.ingredients.join("\n"),
    instructions: recipe.instructions
  };
}

export function emptyRecipeDraft(): RecipeEditDraft {
  return { name: "", time: "", servings: 4, ingredients: "", instructions: "" };
}

export function createRecipe(draft: RecipeEditDraft): KitchenRecipe {
  return {
    id: `recipe-${crypto.randomUUID()}`,
    name: draft.name.trim(),
    time: draft.time.trim() || "Recipe",
    servings: Math.max(1, draft.servings),
    ingredients: parseIngredients(draft.ingredients),
    instructions: draft.instructions.trim(),
    image: "",
    source: "diarydock"
  };
}

export function applyRecipeDraft(recipe: KitchenRecipe, draft: RecipeEditDraft): KitchenRecipe {
  const ingredients = parseIngredients(draft.ingredients);
  return {
    ...recipe,
    name: draft.name.trim(),
    time: draft.time.trim() || recipe.time,
    servings: Math.max(1, draft.servings),
    ingredients: ingredients.length ? ingredients : recipe.ingredients,
    instructions: draft.instructions.trim() || recipe.instructions
  };
}

export function ingredientKey(value: string) {
  return value
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)?\s*(?:x\s*)?(?:g|kg|ml|l|tbsp|tsp)?\s*/i, "")
    .trim();
}

export const recipeImageTerms = ["salmon", "pasta", "traybake", "tacos", "curry", "pizza", "roast"];

function parseIngredients(value: string) {
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}
