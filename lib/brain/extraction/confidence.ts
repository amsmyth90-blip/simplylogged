export type ExtractionConfidenceBand = "high" | "medium" | "low";

export function confidenceBand(confidence: number | undefined | null): ExtractionConfidenceBand {
  if (typeof confidence !== "number") return "low";
  if (confidence >= 0.82) return "high";
  if (confidence >= 0.55) return "medium";
  return "low";
}

export function reviewMessageForConfidence(confidence: number | undefined | null) {
  const band = confidenceBand(confidence);

  if (band === "high") {
    return "DiaryDock found clear details, but please check important fields before relying on them.";
  }

  if (band === "medium") {
    return "DiaryDock found some likely details. Please review them before saving anything important.";
  }

  return "DiaryDock could not confidently read all details. Please check and complete this manually.";
}

