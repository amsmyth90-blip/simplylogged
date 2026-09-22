export type GroceryDateType = "USE_BY" | "BEST_BEFORE" | "DISPLAY_UNTIL";

export type ScannedGrocery = {
  name: string;
  date: string | null;
  dateType: GroceryDateType | null;
  confidence: number;
};

export type GroceryAnalysisResult = {
  groceries: ScannedGrocery[];
  summary: string;
};

export const MAX_GROCERY_PHOTO_COUNT = 8;
export const MAX_GROCERY_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_GROCERY_TOTAL_PHOTO_BYTES = 16 * 1024 * 1024;

export const groceryAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["groceries", "summary"],
  properties: {
    groceries: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "date", "dateType", "confidence"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          date: {
            type: ["string", "null"],
            pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
          },
          dateType: {
            type: ["string", "null"],
            enum: ["USE_BY", "BEST_BEFORE", "DISPLAY_UNTIL", null],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    summary: { type: "string", minLength: 1, maxLength: 500 },
  },
} as const;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function text(value: unknown, maximum: number) {
  if (typeof value !== "string") throw new Error("Invalid grocery analysis.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximum) throw new Error("Invalid grocery analysis.");
  return cleaned;
}

function date(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid grocery analysis.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid grocery analysis.");
  }
  return value;
}

function dateType(value: unknown): GroceryDateType | null {
  if (value === null) return null;
  if (value === "USE_BY" || value === "BEST_BEFORE" || value === "DISPLAY_UNTIL") return value;
  throw new Error("Invalid grocery analysis.");
}

export function parseGroceryAnalysis(value: unknown): GroceryAnalysisResult {
  if (!record(value) || !exact(value, ["groceries", "summary"])
    || !Array.isArray(value.groceries) || value.groceries.length > 40) {
    throw new Error("Invalid grocery analysis.");
  }
  const groceries = value.groceries.map((item) => {
    if (!record(item) || !exact(item, ["name", "date", "dateType", "confidence"])
      || typeof item.confidence !== "number" || !Number.isFinite(item.confidence)
      || item.confidence < 0 || item.confidence > 1) {
      throw new Error("Invalid grocery analysis.");
    }
    const parsedDate = date(item.date);
    const parsedType = dateType(item.dateType);
    if ((parsedDate === null) !== (parsedType === null)) throw new Error("Invalid grocery analysis.");
    return {
      name: text(item.name, 120),
      date: parsedDate,
      dateType: parsedType,
      confidence: item.confidence,
    };
  });
  return { groceries, summary: text(value.summary, 500) };
}
