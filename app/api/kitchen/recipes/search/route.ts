import { NextResponse } from "next/server";

import type { KitchenRecipe } from "@/lib/kitchen-recipes";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

type MealDbMeal = Record<string, string | null>;

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

  const rateLimit = checkRateLimit(`api:kitchen:recipe-search:${user.id}`, {
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
  const response = await fetch(`https://www.themealdb.com/api/json/v1/${apiKey}/search.php?s=${encodeURIComponent(query)}`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) {
    return NextResponse.json({ error: "The online recipe catalogue is unavailable right now." }, { status: 502 });
  }

  const payload = await response.json() as { meals: MealDbMeal[] | null };
  return NextResponse.json({ recipes: (payload.meals ?? []).slice(0, 12).map(mapMeal) });
}
