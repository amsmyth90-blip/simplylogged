"use client";

import { BottomNav } from "@/components/BottomNav";
import { KitchenRecipesHome } from "@/components/kitchen-recipes/KitchenRecipesHome";
import { RecipeCookingMode } from "@/components/kitchen-recipes/RecipeCookingMode";
import { RecipeDialogs } from "@/components/kitchen-recipes/RecipeDialogs";
import { RecipeDirectory } from "@/components/kitchen-recipes/RecipeDirectory";
import { RecipeEditor } from "@/components/kitchen-recipes/RecipeEditor";
import { useKitchenRecipesController } from "@/components/kitchen-recipes/useKitchenRecipesController";

export function KitchenRecipes() {
  const controller = useKitchenRecipesController();
  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.98),transparent_38%),linear-gradient(180deg,#fbfaf7_0%,#f7f4ee_57%,#f2f0e9_100%)] text-[#172033]">
      <KitchenRecipesHome controller={controller} />
      <RecipeDirectory controller={controller} />
      <RecipeDialogs controller={controller} />
      <RecipeCookingMode controller={controller} />
      <RecipeEditor controller={controller} />
      <BottomNav />
    </div>
  );
}
