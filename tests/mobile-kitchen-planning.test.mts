import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  parseKitchenPlanningMutation,
  parseKitchenPlanningSnapshot,
  parseKitchenRecipeDetail,
  type KitchenRecipe,
} from "../packages/kitchen/src/index.ts";
import {
  mutateKitchenPlanningPayload,
  projectKitchenPlanningSnapshot,
} from "../lib/kitchen/planning-payload.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function recipe(overrides: Partial<KitchenRecipe> = {}): KitchenRecipe {
  return {
    contentComplete: true,
    id: "recipe-soup",
    version: 1,
    name: "Tomato soup",
    time: "30 min",
    servings: 4,
    image: "https://www.themealdb.com/images/soup.jpg",
    ingredients: ["2 tins tomatoes", "400ml stock", "1 large onion"],
    instructions: "Cook gently and blend.",
    steps: [{ title: "Cook", instruction: "Simmer until tender.", durationMinutes: 20,
      temperature: "low heat", tip: "Stir occasionally." }],
    favourite: false,
    source: "diarydock",
    sourceUrl: null,
    ...overrides,
  };
}

test("Kitchen planning contracts are exact, bounded and owner-free", () => {
  const snapshot = parseKitchenPlanningSnapshot({
    schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
    revision: null,
    recipes: [recipe()],
    meals: [{ date: "2026-09-07", meal: null }],
    cookingProgress: null,
  });
  assert.equal(snapshot.recipes[0]?.name, "Tomato soup");

  assert.throws(() => parseKitchenPlanningSnapshot({ ...snapshot, ownerId: "other-user" }),
    /unsupported information/);
  assert.throws(() => parseKitchenPlanningSnapshot({ ...snapshot,
    meals: [{ date: "2026-02-30", meal: null }] }), /date is invalid/);
  assert.throws(() => parseKitchenPlanningSnapshot({ ...snapshot,
    meals: [{ date: "2026-09-07", meal: null }, { date: "2026-09-07", meal: null }] }),
  /duplicate dates/);
  assert.throws(() => parseKitchenPlanningMutation({ operation: "ADD_WEEK_TO_SHOPPING",
    revision: null, dates: ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
      "2026-09-11", "2026-09-12", "2026-09-14"] }), /week is invalid/);
  assert.throws(() => parseKitchenPlanningMutation({ operation: "SAVE_RECIPE", revision: null,
    recipe: recipe(), userId: "other-user" }), /unsupported information/);
  assert.throws(() => parseKitchenPlanningMutation({ operation: "SAVE_RECIPE", revision: null,
    recipe: recipe({ image: "https://tracker.example/pixel.png" }) }), /approved image service/);
  assert.throws(() => parseKitchenPlanningMutation({ operation: "SAVE_RECIPE", revision: null,
    recipe: recipe({ contentComplete: false }) }), /reduced offline recipe/);
  const detail = parseKitchenRecipeDetail({
    schemaVersion: KITCHEN_PLANNING_SCHEMA_VERSION,
    revision: null,
    recipe: recipe(),
  });
  assert.equal(detail.recipe.contentComplete, true);
  assert.throws(() => parseKitchenRecipeDetail({ ...detail,
    recipe: recipe({ contentComplete: false }) }), /incomplete/);
});

test("recipe, meal and cooking mutations preserve unrelated desktop state", () => {
  const source = { privateFlag: { keep: true }, kitchenRecipes: [recipe()], mealPlan: {},
    kitchenItems: [{ id: "pantry-onion", name: "Onion", checked: true, section: "Pantry" }] };
  const saved = mutateKitchenPlanningPayload(source, {
    operation: "SAVE_RECIPE", revision: null, recipe: recipe({ name: "Roasted tomato soup" }),
  });
  assert.equal(saved.status, "OK");
  assert.equal((saved.payload?.kitchenRecipes as KitchenRecipe[])[0]?.version, 2);
  assert.deepEqual(saved.payload?.privateFlag, source.privateFlag);

  const meal = { name: "Roasted tomato soup", cookTime: "30 min", servings: 2,
    note: "With bread", imageIndex: 1, recipeId: "recipe-soup" };
  const planned = mutateKitchenPlanningPayload(saved.payload, {
    operation: "SET_MEAL", revision: null, date: "2026-09-07", meal,
  });
  assert.deepEqual((planned.payload?.mealPlan as Record<string, unknown>)["2026-09-07"], meal);

  const cooking = mutateKitchenPlanningPayload(planned.payload, {
    operation: "SET_COOKING_PROGRESS", revision: null,
    progress: { recipeId: "recipe-soup", stepIndex: 0, servings: 2,
      timerRemainingSeconds: 0, timerEndsAt: null, updatedAt: "2026-09-04T10:00:00.000Z" },
  });
  assert.equal(cooking.status, "OK");
  assert.equal(source.mealPlan && Object.keys(source.mealPlan).length, 0);
});

test("shopping additions are derived from an owned recipe and bounded", () => {
  const source = { kitchenRecipes: [recipe()], kitchenItems: [
    { id: "existing", name: "400ml stock", checked: false, section: "Shopping" },
  ] };
  const added = mutateKitchenPlanningPayload(source, {
    operation: "ADD_RECIPE_INGREDIENTS_TO_SHOPPING", revision: null,
    recipeId: "recipe-soup", servings: 2, ingredientIndexes: [0, 1],
  }, () => "fixed");
  assert.equal(added.status, "OK");
  assert.equal(added.addedCount, 1);
  assert.deepEqual((added.payload?.kitchenItems as Array<Record<string, unknown>>)[1], {
    id: "shopping-fixed", name: "1 tins tomatoes", checked: false, section: "Shopping",
  });

  const missing = mutateKitchenPlanningPayload(source, {
    operation: "ADD_RECIPE_INGREDIENTS_TO_SHOPPING", revision: null,
    recipeId: "other", servings: 2, ingredientIndexes: [0],
  });
  assert.equal(missing.status, "NOT_FOUND");
});

test("mobile recipe writes preserve large detail while bounding the service payload", () => {
  const huge = Array.from({ length: 8 }, (_, index) => recipe({
    id: `huge-${index}`,
    instructions: "🔥".repeat(6_000),
    steps: Array.from({ length: 50 }, (_, step) => ({ title: `Step ${step}`,
      instruction: "🔥".repeat(1_000), durationMinutes: null, temperature: "", tip: "" })),
  }));
  const rejected = mutateKitchenPlanningPayload({ kitchenRecipes: huge }, {
    operation: "SAVE_RECIPE", revision: null, recipe: recipe({ id: "new-recipe" }),
  });
  assert.equal(rejected.status, "CAPACITY");
  assert.equal(rejected.payload, null);
  const reducible = Array.from({ length: 3 }, (_, index) => recipe({
    id: `reducible-${index}`,
    instructions: "🔥".repeat(6_000),
    steps: Array.from({ length: 40 }, (_, step) => ({ title: `Step ${step}`,
      instruction: "Stir carefully 🍲".repeat(50), durationMinutes: null,
      temperature: "", tip: "" })),
  }));
  const retained = mutateKitchenPlanningPayload({ kitchenRecipes: reducible }, {
    operation: "SAVE_RECIPE", revision: null,
    recipe: { ...reducible[0]!, name: "Updated without truncation" },
  });
  assert.equal(retained.status, "OK");
  assert.equal((retained.payload?.kitchenRecipes as KitchenRecipe[])[0]?.instructions,
    reducible[0]?.instructions);
  const only = mutateKitchenPlanningPayload({ kitchenRecipes: [recipe()] }, {
    operation: "DELETE_RECIPE", revision: null, recipeId: "recipe-soup",
  });
  assert.equal(only.status, "INVALID_REFERENCE");
});

test("planning projection is deterministic, private and UTF-8 byte bounded", () => {
  const largeRecipes = Array.from({ length: 150 }, (_, index) => recipe({
    id: `recipe-${index}`,
    name: `Family recipe ${index}`,
    ingredients: Array.from({ length: 80 }, () => "2 cups aubergine 🍆"),
    instructions: "🔥".repeat(12_000),
    steps: Array.from({ length: 50 }, (_, step) => ({ title: `Stage ${step}`,
      instruction: "Stir carefully 🍲".repeat(80), durationMinutes: 5,
      temperature: "medium heat", tip: "Keep watching." })),
  }));
  const snapshot = projectKitchenPlanningSnapshot({ kitchenRecipes: largeRecipes,
    secret: "do-not-project", mealPlan: { "2026-09-07": null } },
  "2026-09-04T10:00:00.000Z", new Date("2026-09-04T00:00:00Z"));
  assert.equal(snapshot.recipes.length, 150);
  assert.ok(snapshot.recipes.some((entry) => !entry.contentComplete));
  assert.equal(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024, true);
  assert.equal("secret" in snapshot, false);
  assert.deepEqual(projectKitchenPlanningSnapshot({ kitchenRecipes: largeRecipes,
    mealPlan: { "2026-09-07": null } }, "2026-09-04T10:00:00.000Z",
  new Date("2026-09-04T00:00:00Z")), snapshot);
});

test("Kitchen planning database writes are revision checked and service-only", async () => {
  const database = new PGlite();
  const migration = await read("supabase/migrations/20260904143000_mobile_kitchen_planning_transaction.sql");
  const userId = "11111111-1111-4111-8111-111111111111";
  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create table auth.users(id uuid primary key);
      create table public.app_state(
        id text primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now())
      );
    `);
    await database.exec(migration);
    await database.query("insert into auth.users values ($1)", [userId]);
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select * from public.apply_mobile_kitchen_planning_state($1,null,$2::jsonb)",
      [userId, JSON.stringify({ kitchenRecipes: [] })],
    ), /permission denied|Service role required/i);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const created = await database.query<{ payload: unknown; updated_at: string }>(
      "select * from public.apply_mobile_kitchen_planning_state($1,null,$2::jsonb)",
      [userId, JSON.stringify({ kitchenRecipes: [recipe()] })],
    );
    assert.equal((created.rows[0]?.payload as { kitchenRecipes: unknown[] }).kitchenRecipes.length, 1);
    const conflict = await database.query(
      "select * from public.apply_mobile_kitchen_planning_state($1,$2,$3::jsonb)",
      [userId, "2020-01-01T00:00:00.000Z", JSON.stringify({ replaced: true })],
    );
    assert.equal(conflict.rows.length, 0);
  } finally {
    await database.close();
  }
});

test("mobile Kitchen planning is authenticated, bounded, observed and service-only", async () => {
  const [route, server, migration, hook, client, screen, book, planner, signedIn] = await Promise.all([
    read("app/api/mobile/kitchen/planning/route.ts"),
    read("lib/kitchen/planning-server.ts"),
    read("supabase/migrations/20260904143000_mobile_kitchen_planning_transaction.sql"),
    read("apps/mobile/src/kitchen/use-kitchen-planning.ts"),
    read("apps/mobile/src/kitchen/planning-client.ts"),
    read("apps/mobile/src/kitchen/KitchenPlanningScreen.tsx"),
    read("apps/mobile/src/kitchen/RecipeBook.tsx"),
    read("apps/mobile/src/kitchen/MealPlannerMobile.tsx"),
    read("apps/mobile/src/SignedInApp.tsx"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 384 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /requestedRecipe\(request\)/);
  assert.match(route, /loadKitchenRecipeDetail/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(server, /\.eq\("id", userId\)/);
  assert.match(server, /apply_mobile_kitchen_planning_state/);
  assert.match(server, /normaliseRecipes/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(migration, /pg_column_size\(input_payload\) > 2097152/);
  assert.match(hook, /tryGetReadModel\(store, CACHE_KEY\)/);
  assert.match(hook, /tryPutReadModel\(store/);
  assert.match(hook, /readModelCacheKey\("kitchen-recipe"/);
  assert.match(hook, /loadMobileKitchenRecipe/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(client, /requestDeadline\(20_000\)/);
  assert.match(client, /parseKitchenRecipeDetail/);
  assert.match(screen, /RecipeBook/);
  assert.match(screen, /MealPlannerMobile/);
  for (const operation of ["SAVE_RECIPE", "DELETE_RECIPE", "TOGGLE_RECIPE_FAVOURITE",
    "SET_MEAL", "SET_COOKING_PROGRESS", "ADD_RECIPE_INGREDIENTS_TO_SHOPPING"]) {
    assert.match(book, new RegExp(`operation: "${operation}"`));
  }
  assert.match(planner, /operation: "SWAP_MEALS"/);
  assert.match(planner, /operation: "ADD_WEEK_TO_SHOPPING"/);
  assert.match(book, /Open full recipe/);
  assert.doesNotMatch(book, /Open the web app/i);
  assert.match(signedIn, /destination === "KITCHEN_RECIPES" \|\| destination === "KITCHEN_MEALS"/);
});
