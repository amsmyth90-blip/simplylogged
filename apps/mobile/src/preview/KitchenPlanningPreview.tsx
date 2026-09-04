import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
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
  recipes: [
    { contentComplete: true, id: "recipe-soup", version: 2, name: "Roasted tomato soup", time: "35 min",
      servings: 4, image: "", ingredients: ["2 tins tomatoes", "400ml vegetable stock",
        "1 large onion", "2 cloves garlic", "Fresh basil"],
      instructions: "Roast the tomatoes, onion and garlic until soft. Simmer with stock, then blend and finish with basil.",
      steps: [
        { title: "Prepare", instruction: "Heat the oven and place the vegetables on a roasting tray.",
          durationMinutes: 10, temperature: "200°C", tip: "Keep the pieces an even size." },
        { title: "Roast", instruction: "Roast until soft and lightly caramelised.",
          durationMinutes: 25, temperature: "200°C", tip: "Turn once halfway through." },
        { title: "Blend and serve", instruction: "Simmer with stock, blend smooth and add basil.",
          durationMinutes: 10, temperature: "low heat", tip: "Check the seasoning before serving." },
      ], favourite: true, source: "diarydock", sourceUrl: null },
    { contentComplete: true, id: "recipe-pasta", version: 1, name: "Garden vegetable pasta", time: "25 min",
      servings: 4, image: "", ingredients: ["400g pasta", "2 courgettes", "Cherry tomatoes",
        "Parmesan"], instructions: "Cook the pasta and fold through the sautéed vegetables.",
      steps: [], favourite: false, source: "diarydock", sourceUrl: null },
    { contentComplete: true, id: "recipe-curry", version: 1, name: "Chickpea curry", time: "40 min",
      servings: 4, image: "", ingredients: ["2 tins chickpeas", "400ml coconut milk", "Spinach"],
      instructions: "Simmer gently until rich, then stir in the spinach.", steps: [],
      favourite: false, source: "diarydock", sourceUrl: null },
  ],
  meals: [
    { date: "2026-09-07", meal: { name: "Roasted tomato soup", cookTime: "35 min",
      servings: 4, note: "Serve with warm sourdough.", imageIndex: 0, recipeId: "recipe-soup" } },
    { date: "2026-09-09", meal: { name: "Garden vegetable pasta", cookTime: "25 min",
      servings: 4, note: "Use courgettes from the garden.", imageIndex: 1,
      recipeId: "recipe-pasta" } },
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
