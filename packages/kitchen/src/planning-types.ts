export const KITCHEN_PLANNING_SCHEMA_VERSION = 1;

export type KitchenRecipeSource = "diarydock" | "scanned" | "themealdb";

export type KitchenRecipeStep = {
  title: string;
  instruction: string;
  durationMinutes: number | null;
  temperature: string;
  tip: string;
};

export type KitchenRecipe = {
  contentComplete: boolean;
  id: string;
  version: number;
  name: string;
  time: string;
  servings: number;
  image: string;
  ingredients: string[];
  instructions: string;
  steps: KitchenRecipeStep[];
  favourite: boolean;
  source: KitchenRecipeSource;
  sourceUrl: string | null;
};

export type KitchenMeal = {
  name: string;
  cookTime: string;
  servings: number;
  note: string;
  imageIndex: number;
  recipeId: string | null;
};

export type KitchenPlannedMeal = {
  date: string;
  meal: KitchenMeal | null;
};

export type KitchenCookingProgress = {
  recipeId: string;
  stepIndex: number;
  servings: number;
  timerRemainingSeconds: number;
  timerEndsAt: number | null;
  updatedAt: string;
};

export type KitchenPlanningSnapshot = {
  schemaVersion: typeof KITCHEN_PLANNING_SCHEMA_VERSION;
  revision: string | null;
  recipes: KitchenRecipe[];
  meals: KitchenPlannedMeal[];
  cookingProgress: KitchenCookingProgress | null;
};

export type KitchenRecipeDetail = {
  schemaVersion: typeof KITCHEN_PLANNING_SCHEMA_VERSION;
  revision: string | null;
  recipe: KitchenRecipe;
};

type Revisioned = { revision: string | null };

export type KitchenPlanningMutation =
  | (Revisioned & { operation: "SAVE_RECIPE"; recipe: KitchenRecipe })
  | (Revisioned & { operation: "DELETE_RECIPE"; recipeId: string })
  | (Revisioned & { operation: "TOGGLE_RECIPE_FAVOURITE"; recipeId: string })
  | (Revisioned & { operation: "SET_MEAL"; date: string; meal: KitchenMeal | null })
  | (Revisioned & { operation: "SWAP_MEALS"; sourceDate: string; targetDate: string })
  | (Revisioned & { operation: "SET_COOKING_PROGRESS"; progress: KitchenCookingProgress | null })
  | (Revisioned & {
      operation: "ADD_RECIPE_INGREDIENTS_TO_SHOPPING";
      recipeId: string;
      servings: number;
      ingredientIndexes: number[];
    })
  | (Revisioned & { operation: "ADD_WEEK_TO_SHOPPING"; dates: string[] });
