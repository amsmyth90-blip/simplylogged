import { NextResponse } from "next/server";

import type { KitchenRecipe } from "@/lib/kitchen-recipes";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { correctRecipeSearchQuery } from "@/lib/recipe-search";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

type MealDbMeal = Record<string, string | null>;

type MealDbPayload = {
  meals: MealDbMeal[] | null;
};

async function fetchMealDb(path: string) {
  const response = await fetch(path, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Recipe catalogue request failed.");
  return response.json() as Promise<MealDbPayload>;
}

async function getDetailedMeals(baseUrl: string, meals: MealDbMeal[]) {
  const detailedMeals = await Promise.all(meals.slice(0, 12).map(async meal => {
    const id = meal.idMeal?.trim();
    if (!id) return null;
    const details = await fetchMealDb(`${baseUrl}/lookup.php?i=${encodeURIComponent(id)}`);
    return details.meals?.[0] ?? null;
  }));
  return detailedMeals.filter((meal): meal is MealDbMeal => Boolean(meal));
}

async function searchByIngredient(baseUrl: string, query: string) {
  const terms = Array.from(new Set([
    query,
    ...query.split(/\s+/).filter(term => term.length >= 3).sort((left, right) => right.length - left.length)
  ]));

  for (const term of terms) {
    const results = await fetchMealDb(`${baseUrl}/filter.php?i=${encodeURIComponent(term)}`);
    if (results.meals?.length) return getDetailedMeals(baseUrl, results.meals);
  }
  return [];
}

function mapMeal(meal: MealDbMeal): KitchenRecipe {
  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const ingredient = meal[`strIngredient${index + 1}`]?.trim();
    const measure = meal[`strMeasure${index + 1}`]?.trim();
    return ingredient ? [measure, ingredient].filter(Boolean).join(" ") : null;
  }).filter((item): item is string => Boolean(item));

  return {
    id: `themealdb-${meal.idMeal}`,
    version: 1,
    name: meal.strMeal || "Untitled recipe",
    time: "Recipe guide",
    servings: 4,
    image: meal.strMealThumb || "",
    ingredients,
    instructions: meal.strInstructions || "Open the source recipe for cooking instructions.",
    source: "themealdb",
    sourceUrl: meal.strSource || meal.strYoutube || undefined
  };
}

export async function GET(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to search recipes." }, { status: 401 });
  }

  const rateLimit = await checkServerRateLimit(createRateLimitKey("api:kitchen:recipe-search", user.id), {
    limit: 60,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many recipe searches. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ recipes: [] });
  }

  const apiKey = process.env.THEMEALDB_API_KEY || "1";
  const baseUrl = `https://www.themealdb.com/api/json/v1/${apiKey}`;

  try {
    const nameResults = await fetchMealDb(`${baseUrl}/search.php?s=${encodeURIComponent(query)}`);
    if (nameResults.meals?.length) {
      return NextResponse.json({ recipes: nameResults.meals.slice(0, 12).map(mapMeal) });
    }

    // MealDB's name search does not include ingredients, despite DiaryDock's
    // directory allowing people to search by either. Resolve ingredient matches
    // to their complete records so instructions and ingredient lists are retained.
    const ingredientMeals = await searchByIngredient(baseUrl, query);
    if (ingredientMeals.length) {
      return NextResponse.json({ recipes: ingredientMeals.map(mapMeal) });
    }

    const firstLetter = query.toLowerCase().match(/[a-z]/)?.[0] ?? "a";
    const [ingredientIndex, mealIndex] = await Promise.all([
      fetchMealDb(`${baseUrl}/list.php?i=list`),
      fetchMealDb(`${baseUrl}/search.php?f=${encodeURIComponent(firstLetter)}`)
    ]);
    const correctedQuery = correctRecipeSearchQuery(query, [
      ...(ingredientIndex.meals ?? []).map(meal => meal.strIngredient ?? ""),
      ...(mealIndex.meals ?? []).map(meal => meal.strMeal ?? "")
    ]);

    if (correctedQuery !== query.toLowerCase()) {
      const correctedNameResults = await fetchMealDb(`${baseUrl}/search.php?s=${encodeURIComponent(correctedQuery)}`);
      if (correctedNameResults.meals?.length) {
        return NextResponse.json({
          recipes: correctedNameResults.meals.slice(0, 12).map(mapMeal),
          correctedQuery
        });
      }

      const correctedIngredientMeals = await searchByIngredient(baseUrl, correctedQuery);
      if (correctedIngredientMeals.length) {
        return NextResponse.json({
          recipes: correctedIngredientMeals.map(mapMeal),
          correctedQuery
        });
      }
    }

    return NextResponse.json({ recipes: [] });
  } catch {
    return NextResponse.json({ error: "The online recipe catalogue is unavailable right now." }, { status: 502 });
  }
}
