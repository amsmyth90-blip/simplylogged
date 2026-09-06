import { useState } from "react";

import type { KitchenPlanningSnapshot } from "@diarydock/kitchen";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { MealPlannerMobile } from "./MealPlannerMobile";
import { RecipeBook } from "./RecipeBook";
import { useKitchenPlanning } from "./use-kitchen-planning";

export type KitchenPlanningView = "RECIPES" | "MEALS";

export function KitchenPlanningScreen(props: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenPlanningSnapshot;
  initialView?: KitchenPlanningView;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
}) {
  const planning = useKitchenPlanning(props);
  const [view] = useState<KitchenPlanningView>(props.initialView ?? "RECIPES");
  const mealsOpen = view === "MEALS";
  return (
    <main className={`kitchen-planning-screen ${mealsOpen ? "is-meal-planner" : ""}`}>
      {planning.message ? <p className="planning-message" role="status">{planning.message}</p> : null}
      {planning.loading && !planning.snapshot ? <p className="planning-loading">
        Opening Kitchen planning securely…</p> : null}
      {planning.snapshot ? view === "RECIPES"
        ? <RecipeBook accessToken={props.accessToken} snapshot={planning.snapshot} online={planning.online}
          busy={planning.busy} loadingRecipeId={planning.loadingRecipeId}
          loadRecipe={planning.loadRecipe} mutate={planning.mutate} onBack={props.onBack} />
        : <MealPlannerMobile snapshot={planning.snapshot} online={planning.online}
          busy={planning.busy} mutate={planning.mutate} onBack={props.onBack} /> : null}
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
