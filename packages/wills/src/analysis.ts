export type WillDocumentAnalysis = {
  overview: string;
  executors: string[];
  beneficiaries: string[];
  guardians: string[];
  specificGifts: string[];
  charitableGifts: string[];
  residueOfEstate: string[];
  funeralWishesReferences: string[];
  conditionsOrInstructions: string[];
  questionsOrUnclearWording: string[];
  extractedText: string;
  confidence: number;
};

export type WillAnalysisSummary = Omit<WillDocumentAnalysis, "extractedText">;

export const willDocumentAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: { type: "string" },
    executors: { type: "array", items: { type: "string" } },
    beneficiaries: { type: "array", items: { type: "string" } },
    guardians: { type: "array", items: { type: "string" } },
    specificGifts: { type: "array", items: { type: "string" } },
    charitableGifts: { type: "array", items: { type: "string" } },
    residueOfEstate: { type: "array", items: { type: "string" } },
    funeralWishesReferences: { type: "array", items: { type: "string" } },
    conditionsOrInstructions: { type: "array", items: { type: "string" } },
    questionsOrUnclearWording: { type: "array", items: { type: "string" } },
    extractedText: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "overview", "executors", "beneficiaries", "guardians", "specificGifts",
    "charitableGifts", "residueOfEstate", "funeralWishesReferences",
    "conditionsOrInstructions", "questionsOrUnclearWording", "extractedText",
    "confidence",
  ],
} as const;
