"use client";

import { useState } from "react";

import type { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { KitchenRecipe } from "@/lib/kitchen-recipes";

type UpdateState = ReturnType<typeof useDiaryDockData>["updateState"];

type DiscoveryOptions = {
  updateState: UpdateState;
  selectRecipeId: (recipeId: string) => void;
  closeDirectory: () => void;
};

export function useRecipeDiscovery(options: DiscoveryOptions) {
  const [search, setSearch] = useState("");
  const [onlineRecipes, setOnlineRecipes] = useState<KitchenRecipe[]>([]);
  const [onlineCorrection, setOnlineCorrection] = useState("");
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [scanState, setScanState] = useState<"idle" | "reading" | "saved">("idle");
  const [scanMessage, setScanMessage] = useState("");

  const changeSearch = (value: string) => {
    setSearch(value);
    setOnlineRecipes([]);
    setOnlineCorrection("");
    setOnlineError("");
  };

  const clearSearch = () => changeSearch("");

  const searchOnline = async () => {
    if (search.trim().length < 2) return;
    setOnlineLoading(true);
    setOnlineError("");
    try {
      const response = await fetch(`/api/kitchen/recipes/search?q=${encodeURIComponent(search.trim())}`);
      const payload = await response.json() as {
        recipes?: KitchenRecipe[];
        correctedQuery?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to search recipes.");
      setOnlineRecipes(payload.recipes ?? []);
      setOnlineCorrection(payload.correctedQuery ?? "");
      if (!payload.recipes?.length) setOnlineError("No online recipes matched that search.");
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : "Unable to search recipes.");
    } finally {
      setOnlineLoading(false);
    }
  };

  const scanRecipe = async (file: File) => {
    setScanState("reading");
    setScanMessage("Reading the recipe and finding its matching dish photo...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/kitchen/recipes/scan", { method: "POST", body: formData });
      const payload = await response.json() as {
        recipe?: KitchenRecipe;
        matchedPhoto?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.recipe) {
        throw new Error(payload.error || "The recipe could not be read.");
      }
      const recipe = payload.recipe;
      options.updateState(current => ({
        ...current,
        kitchenRecipes: [recipe, ...current.kitchenRecipes.filter(item => item.id !== recipe.id)]
      }));
      options.selectRecipeId(recipe.id);
      setScanState("saved");
      setScanMessage(payload.matchedPhoto
        ? "Recipe saved with a matching dish photo."
        : "Recipe saved. Add a dish photo later for the best result.");
      window.setTimeout(() => {
        setScanState("idle");
        options.closeDirectory();
      }, 1400);
    } catch (error) {
      setScanState("idle");
      setScanMessage("");
      setOnlineError(error instanceof Error ? error.message : "The recipe could not be read.");
    }
  };

  return {
    search,
    onlineRecipes,
    onlineCorrection,
    onlineLoading,
    onlineError,
    scanState,
    scanMessage,
    changeSearch,
    clearSearch,
    searchOnline,
    scanRecipe
  };
}
