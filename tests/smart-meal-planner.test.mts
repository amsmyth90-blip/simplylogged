import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildSmartWeekPlan, parseKitchenPlanningMutation, smartStarterRecipes,
  type KitchenRecipe } from "../packages/kitchen/src/index.ts";
import { mutateKitchenPlanningPayload } from "../lib/kitchen/planning-mutation.ts";

function recipe(id: string, overrides: Partial<KitchenRecipe> = {}): KitchenRecipe {
  return { contentComplete: true, id, version: 1, name: id, time: "35 min", servings: 4,
    image: "", ingredients: ["1 onion"], instructions: "Cook and serve.", steps: [],
    favourite: false, source: "diarydock", sourceUrl: null, ...overrides };
}

const dates = ["2026-09-07", "2026-09-08", "2026-09-09"];

test("smart week planning honours time, ingredient and appliance preferences", () => {
  const recipes = [
    recipe("slow roast", { time: "2 hr", favourite: true }),
    recipe("air fryer chicken", { time: "20 min", ingredients: ["chicken", "paprika"] }),
    recipe("quick pasta", { time: "15 min", ingredients: ["pasta", "spinach"] }),
  ];
  const plan = buildSmartWeekPlan(recipes, { dates, servings: 3, maximumMinutes: 30,
    focus: "USE_UP", useUp: ["chicken"], skip: ["spinach"], appliances: ["air fryer"],
    rotation: 0 });
  assert.equal(plan.length, 3);
  assert.equal(plan[0]?.meal?.recipeId, "air fryer chicken");
  assert.equal(plan.every((entry) => entry.meal?.servings === 3), true);
  assert.equal(plan.some((entry) => entry.meal?.recipeId === "slow roast"), false);
  assert.equal(plan.some((entry) => entry.meal?.recipeId === "quick pasta"), false);
  assert.doesNotThrow(() => buildSmartWeekPlan([
    recipe("bounded", { time: `${"0".repeat(20_000)} min` }),
  ], { dates, servings: 2, maximumMinutes: 30, focus: "QUICK", useUp: [], skip: [],
    appliances: ["hob"], rotation: 0 }));
});

test("generated week mutations are exact, bounded and confined to one week", () => {
  const meal = { name: "Soup", cookTime: "30 min", servings: 4, note: "Warm",
    imageIndex: 0, recipeId: "soup" };
  const parsed = parseKitchenPlanningMutation({ operation: "SET_WEEK_PLAN", revision: null,
    meals: dates.map((date) => ({ date, meal })), addToShopping: true });
  assert.equal(parsed.operation, "SET_WEEK_PLAN");
  assert.throws(() => parseKitchenPlanningMutation({ operation: "SET_WEEK_PLAN", revision: null,
    meals: [{ date: dates[0], meal }, { date: "2026-09-14", meal }], addToShopping: true }),
  /one week/);
  assert.throws(() => parseKitchenPlanningMutation({ operation: "SET_WEEK_PLAN", revision: null,
    meals: [{ date: dates[0], meal }], addToShopping: "yes" }), /invalid/);
});

test("starter recipes let a new account create and save its first smart plan", () => {
  const starterRecipeIds = smartStarterRecipes.map((item) => item.id);
  const meals = buildSmartWeekPlan(smartStarterRecipes, { dates, servings: 4,
    maximumMinutes: 45, focus: "VARIETY", useUp: [], skip: [],
    appliances: ["oven", "hob"], rotation: 0 });
  assert.equal(meals.length, dates.length);
  const parsed = parseKitchenPlanningMutation({ operation: "SET_WEEK_PLAN", revision: null,
    meals, addToShopping: true, starterRecipeIds });
  const result = mutateKitchenPlanningPayload({}, parsed, () => "starter");
  assert.equal(result.status, "OK");
  assert.equal((result.payload?.kitchenRecipes as KitchenRecipe[]).length,
    smartStarterRecipes.length);
  assert.equal(result.addedCount > 0, true);
});

test("only server-owned starter recipes can be installed with a smart plan", () => {
  const starter = smartStarterRecipes[0]!;
  const meals = dates.slice(0, 1).map((date) => ({ date, meal: { name: starter.name,
    cookTime: starter.time, servings: 4, note: starter.instructions,
    imageIndex: 0, recipeId: starter.id } }));
  const result = mutateKitchenPlanningPayload({}, { operation: "SET_WEEK_PLAN", revision: null,
    meals, addToShopping: false, starterRecipeIds: ["not-a-diarydock-starter"] });
  assert.equal(result.status, "INVALID_REFERENCE");
  assert.equal(result.payload, null);
});

test("saving a generated shopping list opens the complete Kitchen list", async () => {
  const source = await readFile(new URL(
    "../apps/mobile/src/kitchen/SmartMealPlanner.tsx", import.meta.url), "utf8");
  const parent = await readFile(new URL(
    "../apps/mobile/src/kitchen/MealPlannerMobile.tsx", import.meta.url), "utf8");
  assert.match(source, /addToShopping \? "Save & view list" : "Save my week"/);
  assert.match(source, /if \(addToShopping\) props\.onOpenShopping\(\)/);
  assert.match(parent, /onOpenShopping=\{props\.onBack\}/);
});

test("smart planning omits the unused supermarket step", async () => {
  const source = await readFile(new URL(
    "../apps/mobile/src/kitchen/SmartMealPlanner.tsx", import.meta.url), "utf8");
  const visuals = await readFile(new URL(
    "../apps/mobile/src/kitchen/SmartPlannerVisuals.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Where do you shop\?|ShopVisual|shopChoices|shops/);
  assert.match(source, /\["APPLIANCES", "PREFERENCES", "REVIEW"\]/);
  assert.match(source, /\/3<\/span>/);
  assert.doesNotMatch(visuals, /Tesco|Sainsbury|ShopVisual|shopChoices/);
});

test("generated week and pantry-aware shopping list are saved atomically", () => {
  const soup = recipe("soup", { name: "Garden soup", ingredients: ["1 onion", "2 carrots"] });
  const meals = dates.map((date) => ({ date, meal: { name: soup.name, cookTime: soup.time,
    servings: 4, note: soup.instructions, imageIndex: 0, recipeId: soup.id } }));
  const result = mutateKitchenPlanningPayload({ kitchenRecipes: [soup], mealPlan: {},
    kitchenItems: [{ id: "pantry-onion", name: "Onion", checked: true, section: "Pantry" }] },
  { operation: "SET_WEEK_PLAN", revision: null, meals, addToShopping: true }, () => "fixed");
  assert.equal(result.status, "OK");
  assert.equal(Object.keys(result.payload?.mealPlan as object).length, 3);
  assert.equal(result.addedCount, 1);
  assert.deepEqual((result.payload?.kitchenItems as Array<Record<string, unknown>>)[1], {
    id: "shopping-fixed", name: "2 carrots", checked: false, section: "Shopping",
  });
});
