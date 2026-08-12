import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  pantryAnalysisSchema,
  type PantryAnalysisResult
} from "@/lib/pantry-analysis";
import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PHOTO_COUNT = 8;

function getVisionModel() {
  return process.env.OPENAI_VISION_MODEL || "gpt-5";
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Kitchen photo reading is not configured yet." }, { status: 503 });
  }

  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "You must be signed in to check your kitchen." }, { status: 401 });
  }

  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("api:kitchen:analyse", user.id), {
    limit: 12,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many kitchen photo checks. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "Add at least one fridge or pantry photo." }, { status: 400 });
  }

  if (files.length > MAX_PHOTO_COUNT) {
    return NextResponse.json({ error: `Add no more than ${MAX_PHOTO_COUNT} photos at once.` }, { status: 400 });
  }

  if (files.some(file => !file.type.startsWith("image/"))) {
    return NextResponse.json({ error: "Only fridge, freezer, or pantry images can be analysed here." }, { status: 400 });
  }

  if (files.some(file => file.size > MAX_FILE_SIZE)) {
    return NextResponse.json({ error: "Each photo must be smaller than 8 MB." }, { status: 400 });
  }

  const imageUrls = await Promise.all(files.map(async file => {
    const buffer = Buffer.from(await file.arrayBuffer());
    return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
  }));

  const prompt = [
    "You are helping a household organise food in a mobile app called DiaryDock.",
    `Inspect all ${files.length} kitchen photo${files.length === 1 ? "" : "s"} together.`,
    "Identify visible food and drink from the fridge, freezer, cupboards, worktops, or pantry.",
    "Use simple British English ingredient names and combine duplicates.",
    "Do not claim an ingredient is present unless it is visible or clearly labelled.",
    "Confidence must reflect visual certainty. The user will confirm the list.",
    "Suggest exactly four practical family meals that use as many visible ingredients as possible.",
    "For each meal, separate ingredients visible in the photos from ingredients that would need buying.",
    "Treat salt, pepper, cooking oil, and water as basic staples and do not add them to missingIngredients.",
    "Keep meal summaries short, friendly, and specific. Keep missing items concise and deduplicated."
  ].join(" ");

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: getVisionModel(),
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          ...imageUrls.map(imageUrl => ({
            type: "input_image" as const,
            image_url: imageUrl,
            detail: "high" as const
          }))
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "diarydock_pantry_analysis",
          schema: pantryAnalysisSchema,
          strict: true
        }
      }
    });

    if (!response.output_text) {
      return NextResponse.json({ error: "The kitchen photos could not be read." }, { status: 502 });
    }

    return NextResponse.json({ analysis: JSON.parse(response.output_text) as PantryAnalysisResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The kitchen photos could not be analysed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
