import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  smartStarterRecipes,
  type KitchenPlanningSnapshot,
} from "@diarydock/kitchen";

import {
  KitchenPlanningScreen,
  type KitchenPlanningView,
} from "@mobile/kitchen/KitchenPlanningScreen";
import { PreviewStore } from "./PreviewStore";

const snapshot: KitchenPlanningSnapshot = {
  schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
  revision: "2026-09-04T10:00:00.000Z",
  recipes: structuredClone(smartStarterRecipes.slice(0, 3)),
  meals: [
    { date: "2026-09-07", meal: { name: smartStarterRecipes[0]!.name,
      cookTime: smartStarterRecipes[0]!.time, servings: 4, note: "Family dinner.", imageIndex: 0,
      recipeId: smartStarterRecipes[0]!.id } },
    { date: "2026-09-09", meal: { name: smartStarterRecipes[1]!.name,
      cookTime: smartStarterRecipes[1]!.time, servings: 4, note: "Midweek meal.", imageIndex: 1,
      recipeId: smartStarterRecipes[1]!.id } },
  ],
  cookingProgress: null,
};

export function KitchenPlanningPreview({ view = "RECIPES" }: { view?: KitchenPlanningView }) {
  const previewOnline = new URLSearchParams(window.location.search).get("online") === "true";
  return <KitchenPlanningScreen accessToken="preview-access-token-that-is-never-sent"
    disableOnline={!previewOnline} initialSnapshot={snapshot} initialView={view} store={new PreviewStore()}
    syncStatus="IDLE" onBack={() => undefined} onNavigate={() => undefined} />;
}

export function KitchenRecipesPreview() { return <KitchenPlanningPreview view="RECIPES" />; }
export function KitchenMealsPreview() { return <KitchenPlanningPreview view="MEALS" />; }
