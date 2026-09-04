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
  const [view, setView] = useState<KitchenPlanningView>(props.initialView ?? "RECIPES");
  return (
    <main className="kitchen-planning-screen">
      <header className="planning-header"><button type="button" onClick={props.onBack}
        aria-label="Back to the Kitchen">‹</button><div><small>Kitchen</small>
        <h1>{view === "RECIPES" ? "Family recipes" : "Weekly meal planner"}</h1></div>
        <span className={planning.online ? "is-live" : "is-cached"}>
          {planning.online ? "Live" : "Offline copy"}</span></header>
      <nav className="planning-tabs" aria-label="Kitchen planning">
        <button type="button" className={view === "RECIPES" ? "is-active" : ""}
          onClick={() => setView("RECIPES")}>Recipes</button>
        <button type="button" className={view === "MEALS" ? "is-active" : ""}
          onClick={() => setView("MEALS")}>Meal planner</button>
      </nav>
      {planning.message ? <p className="planning-message" role="status">{planning.message}</p> : null}
      {planning.loading && !planning.snapshot ? <p className="planning-loading">
        Opening Kitchen planning securely…</p> : null}
      {planning.snapshot ? view === "RECIPES"
        ? <RecipeBook accessToken={props.accessToken} snapshot={planning.snapshot} online={planning.online}
          busy={planning.busy} loadingRecipeId={planning.loadingRecipeId}
          loadRecipe={planning.loadRecipe} mutate={planning.mutate} />
        : <MealPlannerMobile snapshot={planning.snapshot} online={planning.online}
          busy={planning.busy} mutate={planning.mutate} /> : null}
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
