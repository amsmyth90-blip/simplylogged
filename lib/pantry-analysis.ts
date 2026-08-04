export type DetectedIngredient = {
  name: string;
  category: string;
  confidence: number;
};

export type PantryMealSuggestion = {
  name: string;
  summary: string;
  cookTime: string;
  availableIngredients: string[];
  missingIngredients: string[];
};

export type PantryAnalysisResult = {
  ingredients: DetectedIngredient[];
  mealSuggestions: PantryMealSuggestion[];
  summary: string;
};

const stringArray = {
  type: "array",
  items: { type: "string" }
} as const;

export const pantryAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ingredients", "mealSuggestions", "summary"],
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "confidence"],
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
    mealSuggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "summary", "cookTime", "availableIngredients", "missingIngredients"],
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          cookTime: { type: "string" },
          availableIngredients: stringArray,
          missingIngredients: stringArray
        }
      }
    },
    summary: { type: "string" }
  }
} as const;
