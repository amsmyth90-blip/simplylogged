import { useCallback, useEffect, useMemo, useState } from "react";

import type { PantryAnalysisResult } from "@diarydock/kitchen";

import { chooseDocumentPhoto, takeDocumentPhoto,
  type CapturedDocument } from "@mobile/capture/capture-source";
import { analysePantryPhotos } from "./pantry-analysis-client";
import type { KitchenDraftMutation } from "./kitchen-client";

export type PantryStage = "capture" | "checking" | "confirm" | "meals" | "shopping";

function normalise(value: string) {
  return value.trim().toLocaleLowerCase("en-GB");
}

export function usePantryPlanner(input: {
  accessToken: string;
  mutate: (mutation: KitchenDraftMutation) => Promise<boolean>;
  online: boolean;
}) {
  const [stage, setStage] = useState<PantryStage>("capture");
  const [captures, setCaptures] = useState<CapturedDocument[]>([]);
  const [analysis, setAnalysis] = useState<PantryAnalysisResult | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [selectedMeal, setSelectedMeal] = useState(0);
  const [error, setError] = useState("");
  const previews = useMemo(() => captures.map((capture) => capture.previewUrl
    ?? URL.createObjectURL(new Blob([capture.bytes as BlobPart], { type: capture.mimeType }))), [captures]);

  useEffect(() => () => previews.forEach((url, index) => {
    if (!captures[index]?.previewUrl) URL.revokeObjectURL(url);
  }), [captures, previews]);

  const add = useCallback(async (source: "camera" | "library") => {
    setError("");
    if (!input.online) { setError("Connect to check kitchen photos."); return; }
    try {
      const capture = await (source === "camera" ? takeDocumentPhoto() : chooseDocumentPhoto());
      if (!capture) return;
      setCaptures((current) => {
        if (current.length >= 8) { setError("Choose up to eight kitchen photos."); return current; }
        if (current.reduce((total, item) => total + item.bytes.byteLength, capture.bytes.byteLength)
          > 16 * 1024 * 1024) { setError("Keep the combined kitchen photos under 16 MB."); return current; }
        return [...current, capture];
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That photo could not be opened.");
    }
  }, [input.online]);

  const analyse = useCallback(async () => {
    if (!captures.length) return;
    setStage("checking"); setError("");
    try {
      const result = await analysePantryPhotos(captures, input.accessToken);
      setAnalysis(result);
      setConfirmed(new Set(result.ingredients.map((item) => normalise(item.name))));
      setSelectedMeal(0); setStage("confirm");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photos could not be checked.");
      setStage("capture");
    }
  }, [captures, input.accessToken]);

  const confirmStock = useCallback(async () => {
    if (!analysis) return;
    const names = analysis.ingredients.filter((item) => confirmed.has(normalise(item.name)))
      .map((item) => item.name);
    if (names.length && !await input.mutate({ operation: "ADD_ITEMS", names, section: "Pantry" })) return;
    setStage("meals");
  }, [analysis, confirmed, input]);

  const addMissing = useCallback(async () => {
    const meal = analysis?.mealSuggestions[selectedMeal];
    if (!meal) return;
    if (meal.missingIngredients.length && !await input.mutate({ operation: "ADD_ITEMS",
      names: meal.missingIngredients, section: "Shopping" })) return;
    setStage("shopping");
  }, [analysis, input, selectedMeal]);

  function reset() {
    setCaptures([]); setAnalysis(null); setConfirmed(new Set());
    setSelectedMeal(0); setError(""); setStage("capture");
  }

  return { add, addMissing, analyse, analysis, captures, confirmStock, confirmed, error,
    meal: analysis?.mealSuggestions[selectedMeal] ?? null, previews, reset, selectedMeal,
    setCaptures, setConfirmed, setSelectedMeal, setStage, stage };
}
