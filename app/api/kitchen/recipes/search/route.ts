import { NextResponse } from "next/server";

import type { KitchenRecipe } from "@diarydock/kitchen";
import { ExternalResponseError, readBoundedJsonResponse } from "@/lib/http/bounded-json-response";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { correctRecipeSearchQuery } from "@/lib/recipe-search";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

type MealDbMeal = Record<string, string | null>;
type MealDbPayload = { meals: MealDbMeal[] | null };

function respond(request: Request, observation: RequestObservation, body: unknown,
  status = 200, outcome = "ok", records = 0) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

function clean(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function httpsUrl(value: unknown, image = false) {
  const candidate = clean(value, 2_048);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    const approvedImage = !image || url.hostname === "themealdb.com"
      || url.hostname === "www.themealdb.com";
    return url.protocol === "https:" && !url.username && !url.password && approvedImage
      ? url.toString() : "";
  } catch { return ""; }
}

function mealDbPayload(value: unknown): MealDbPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExternalResponseError("The recipe service returned invalid data.");
  }
  const raw = (value as Record<string, unknown>).meals;
  if (raw === null) return { meals: null };
  if (!Array.isArray(raw)) throw new ExternalResponseError("The recipe service returned invalid data.");
  const meals = raw.slice(0, 50).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const meal: MealDbMeal = {};
    for (const [key, item] of Object.entries(entry)) {
      if (typeof item === "string" || item === null) meal[key.slice(0, 80)] = item;
    }
    return [meal];
  });
  return { meals };
}

async function fetchMealDb(path: string, signal: AbortSignal) {
  const response = await fetch(path, {
    next: { revalidate: 3600 },
    signal,
  });
  if (!response.ok) throw new Error("Recipe catalogue request failed.");
  return mealDbPayload(await readBoundedJsonResponse(response, 512 * 1024));
}

async function getDetailedMeals(baseUrl: string, meals: MealDbMeal[], signal: AbortSignal) {
  const detailed = await Promise.all(meals.slice(0, 12).map(async (meal) => {
    const id = clean(meal.idMeal, 80).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id) return null;
    const result = await fetchMealDb(`${baseUrl}/lookup.php?i=${encodeURIComponent(id)}`, signal);
    return result.meals?.[0] ?? null;
  }));
  return detailed.filter((meal): meal is MealDbMeal => Boolean(meal));
}

async function searchByIngredient(baseUrl: string, query: string, signal: AbortSignal) {
  const terms = Array.from(new Set([query,
    ...query.split(/\s+/).filter((term) => term.length >= 3)
      .sort((left, right) => right.length - left.length)])).slice(0, 8);
  for (const term of terms) {
    const results = await fetchMealDb(
      `${baseUrl}/filter.php?i=${encodeURIComponent(term)}`, signal);
    if (results.meals?.length) return getDetailedMeals(baseUrl, results.meals, signal);
  }
  return [];
}

function mapMeal(meal: MealDbMeal): KitchenRecipe | null {
  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const ingredient = clean(meal[`strIngredient${index + 1}`], 180);
    const measure = clean(meal[`strMeasure${index + 1}`], 60);
    return ingredient ? [measure, ingredient].filter(Boolean).join(" ").slice(0, 240) : null;
  }).filter((item): item is string => Boolean(item));
  const id = clean(meal.idMeal, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return null;
  return {
    contentComplete: true,
    id: `themealdb-${id}`,
    version: 1,
    name: clean(meal.strMeal, 160) || "Untitled recipe",
    time: "Recipe guide",
    servings: 4,
    image: httpsUrl(meal.strMealThumb, true),
    ingredients,
    instructions: clean(meal.strInstructions, 12_000)
      || "Open the source recipe for cooking instructions.",
    steps: [],
    favourite: false,
    source: "themealdb",
    sourceUrl: httpsUrl(meal.strSource) || httpsUrl(meal.strYoutube) || null,
  };
}

export function OPTIONS(request: Request) { return mobilePreflight(request); }

export async function GET(request: Request) {
  const observation = new RequestObservation({ operation: "kitchen-recipe-search", request,
    route: "/api/kitchen/recipes/search" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Recipe search is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user) return respond(request, observation,
    { error: "You must be signed in to search recipes." }, 401, "unauthenticated");
  const rate = await checkServerRateLimit(createRateLimitKey(
    "api:kitchen:recipe-search", auth.user.id), { limit: 60, windowMs: 10 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Too many recipe searches. Please wait a moment and try again." },
    429, "rate-limited");
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return respond(request, observation, { recipes: [] });
  if (query.length > 80) return respond(request, observation,
    { error: "Keep the recipe search under 80 characters." }, 400, "invalid-query");
  const apiKey = clean(process.env.THEMEALDB_API_KEY, 120) || "1";
  if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) return respond(request, observation,
    { error: "Recipe search is unavailable." }, 503, "invalid-configuration");
  const baseUrl = `https://www.themealdb.com/api/json/v1/${apiKey}`;
  const signal = AbortSignal.timeout(15_000);
  try {
    const nameResults = await fetchMealDb(
      `${baseUrl}/search.php?s=${encodeURIComponent(query)}`, signal);
    if (nameResults.meals?.length) {
      const recipes = nameResults.meals.slice(0, 12).map(mapMeal)
        .filter((recipe): recipe is KitchenRecipe => Boolean(recipe));
      return respond(request, observation, { recipes }, 200, "ok", recipes.length);
    }
    const ingredientMeals = await searchByIngredient(baseUrl, query, signal);
    if (ingredientMeals.length) {
      const recipes = ingredientMeals.map(mapMeal)
        .filter((recipe): recipe is KitchenRecipe => Boolean(recipe));
      return respond(request, observation, { recipes }, 200, "ok", recipes.length);
    }
    const firstLetter = query.toLowerCase().match(/[a-z]/)?.[0] ?? "a";
    const [ingredientIndex, mealIndex] = await Promise.all([
      fetchMealDb(`${baseUrl}/list.php?i=list`, signal),
      fetchMealDb(`${baseUrl}/search.php?f=${encodeURIComponent(firstLetter)}`, signal),
    ]);
    const correctedQuery = correctRecipeSearchQuery(query, [
      ...(ingredientIndex.meals ?? []).map((meal) => clean(meal.strIngredient, 180)),
      ...(mealIndex.meals ?? []).map((meal) => clean(meal.strMeal, 160)),
    ]);
    if (correctedQuery !== query.toLowerCase()) {
      const corrected = await fetchMealDb(
        `${baseUrl}/search.php?s=${encodeURIComponent(correctedQuery)}`, signal);
      const matches = corrected.meals?.length ? corrected.meals.slice(0, 12)
        : await searchByIngredient(baseUrl, correctedQuery, signal);
      if (matches.length) {
        const recipes = matches.map(mapMeal)
          .filter((recipe): recipe is KitchenRecipe => Boolean(recipe));
        return respond(request, observation, { recipes, correctedQuery }, 200, "ok", recipes.length);
      }
    }
    return respond(request, observation, { recipes: [] });
  } catch {
    return respond(request, observation,
      { error: "The online recipe catalogue is unavailable right now." }, 502, "provider-unavailable");
  }
}
