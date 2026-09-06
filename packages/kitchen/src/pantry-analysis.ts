export type DetectedIngredient = { name: string; category: string; confidence: number };

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

export const MAX_PANTRY_PHOTO_COUNT = 8;
export const MAX_PANTRY_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PANTRY_TOTAL_PHOTO_BYTES = 16 * 1024 * 1024;

export const pantryAnalysisSchema = {
  type: "object", additionalProperties: false,
  required: ["ingredients", "mealSuggestions", "summary"],
  properties: {
    ingredients: { type: "array", maxItems: 120, items: {
      type: "object", additionalProperties: false,
      required: ["name", "category", "confidence"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 120 },
        category: { type: "string", minLength: 1, maxLength: 80 },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    } },
    mealSuggestions: { type: "array", minItems: 4, maxItems: 4, items: {
      type: "object", additionalProperties: false,
      required: ["name", "summary", "cookTime", "availableIngredients", "missingIngredients"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 160 },
        summary: { type: "string", minLength: 1, maxLength: 500 },
        cookTime: { type: "string", minLength: 1, maxLength: 80 },
        availableIngredients: stringArray(), missingIngredients: stringArray(),
      },
    } },
    summary: { type: "string", minLength: 1, maxLength: 1_000 },
  },
} as const;

function stringArray() {
  return { type: "array", maxItems: 80,
    items: { type: "string", minLength: 1, maxLength: 160 } } as const;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function text(value: unknown, maximum: number) {
  if (typeof value !== "string") throw new Error("Invalid pantry analysis.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximum) throw new Error("Invalid pantry analysis.");
  return cleaned;
}

function texts(value: unknown) {
  if (!Array.isArray(value) || value.length > 80) throw new Error("Invalid pantry analysis.");
  return value.map((item) => text(item, 160));
}

export function parsePantryAnalysis(value: unknown): PantryAnalysisResult {
  if (!record(value) || !exact(value, ["ingredients", "mealSuggestions", "summary"])
    || !Array.isArray(value.ingredients) || value.ingredients.length > 120
    || !Array.isArray(value.mealSuggestions) || value.mealSuggestions.length !== 4) {
    throw new Error("Invalid pantry analysis.");
  }
  const ingredients = value.ingredients.map((item) => {
    if (!record(item) || !exact(item, ["name", "category", "confidence"])
      || typeof item.confidence !== "number" || !Number.isFinite(item.confidence)
      || item.confidence < 0 || item.confidence > 1) throw new Error("Invalid pantry analysis.");
    return { name: text(item.name, 120), category: text(item.category, 80), confidence: item.confidence };
  });
  const mealSuggestions = value.mealSuggestions.map((item) => {
    if (!record(item) || !exact(item, ["name", "summary", "cookTime",
      "availableIngredients", "missingIngredients"])) throw new Error("Invalid pantry analysis.");
    return { name: text(item.name, 160), summary: text(item.summary, 500),
      cookTime: text(item.cookTime, 80), availableIngredients: texts(item.availableIngredients),
      missingIngredients: texts(item.missingIngredients) };
  });
  return { ingredients, mealSuggestions, summary: text(value.summary, 1_000) };
}
