import OpenAI from "openai";
import { NextResponse } from "next/server";

import type { KitchenRecipe } from "@/lib/kitchen-recipes";
import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const recipeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    time: { type: "string" },
    servings: { type: "integer" },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "string" },
    steps: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          instruction: { type: "string" },
          durationMinutes: { type: "integer" },
          temperature: { type: "string" },
          tip: { type: "string" }
        },
        required: ["title", "instruction", "durationMinutes", "temperature", "tip"]
      }
    }
  },
  required: ["name", "time", "servings", "ingredients", "instructions", "steps"]
} as const;

type ScannedRecipe = Pick<KitchenRecipe, "name" | "time" | "servings" | "ingredients" | "instructions" | "steps">;
type MealDbMatch = { idMeal?: string; strMeal?: string; strMealThumb?: string; strSource?: string };

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Recipe scanning is not configured yet." }, { status: 503 });
  }
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to scan recipes." }, { status: 401 });
  }

  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("api:kitchen:recipe-scan", user.id), {
    limit: 12,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many recipe scans. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please choose a recipe photo." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Please keep the recipe photo under 8 MB." }, { status: 400 });
  }

  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_VISION_MODEL || "gpt-5",
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Read this photographed recipe card, cookbook page, or handwritten recipe. Extract the exact dish name, total cooking time, number of servings, complete ingredient list with quantities, and a detailed sequence of cooking steps. Use 4 servings only when the source does not state a yield. Each step needs a short title, one clear instruction, its duration in whole minutes, any oven or hob temperature exactly as written, and a useful doneness or safety tip when present. Use 0 for a step with no stated duration and an empty string for missing temperature or tip. Preserve all important preparation, temperature, timing, resting, and doneness details. Do not invent missing details."
        },
        { type: "input_image", image_url: dataUrl, detail: "high" }
      ]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "diarydock_recipe_scan",
        schema: recipeSchema,
        strict: true
      }
    }
  });

  if (!response.output_text) {
    return NextResponse.json({ error: "No recipe could be read from that photo." }, { status: 422 });
  }

  const scanned = JSON.parse(response.output_text) as ScannedRecipe;
  const apiKey = process.env.THEMEALDB_API_KEY || "1";
  const matchResponse = await fetch(`https://www.themealdb.com/api/json/v1/${apiKey}/search.php?s=${encodeURIComponent(scanned.name)}`);
  const matchPayload = matchResponse.ok ? await matchResponse.json() as { meals?: MealDbMatch[] | null } : {};
  const match = matchPayload.meals?.[0];

  const recipe: KitchenRecipe = {
    id: `scanned-${crypto.randomUUID()}`,
    version: 1,
    ...scanned,
    image: match?.strMealThumb || "",
    source: "scanned",
    sourceUrl: match?.strSource || undefined
  };

  return NextResponse.json({ recipe, matchedPhoto: Boolean(match?.strMealThumb) });
}
