"use client";

import { KitchenNoticeboard } from "@/components/KitchenNoticeboard";
import { KitchenPantryPlanner } from "@/components/KitchenPantryPlanner";
import { KitchenRecipes } from "@/components/KitchenRecipes";
import { FamilyCalendar } from "@/components/kitchen-feature/FamilyCalendar";
import { KitchenDocuments } from "@/components/kitchen-feature/KitchenDocuments";
import { MealPlanner } from "@/components/kitchen-feature/MealPlanner";
import type { KitchenFeature } from "@/components/kitchen-feature/kitchen-feature-model";

export function KitchenFeatureWorkspace({ feature }: { feature: KitchenFeature }) {
  if (feature === "calendar") return <FamilyCalendar />;
  if (feature === "meal-planner") return <MealPlanner />;
  if (feature === "pantry") return <KitchenPantryPlanner />;
  if (feature === "recipes") return <KitchenRecipes />;
  if (feature === "notes") return <KitchenNoticeboard />;
  return <KitchenDocuments />;
}
