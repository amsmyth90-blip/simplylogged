import OpenAI from "openai";
import { NextResponse } from "next/server";

import { parseKitchenRecipe, type KitchenRecipe } from "@diarydock/kitchen";

import { inspectCaptureFile } from "@/lib/capture/file-security";
import { ExternalResponseError, readBoundedJsonResponse } from "@/lib/http/bounded-json-response";
import { readBoundedSingleFile } from "@/lib/http/bounded-single-file";
import { RequestBodyError } from "@/lib/http/bounded-body";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

const MAX_RECIPE_IMAGE_BYTES = 4 * 1024 * 1024;
const supportedImages = new Set(["image/jpeg", "image/png", "image/webp"]);

const recipeSchema = {
  type: "object", additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    time: { type: "string", maxLength: 80 },
    servings: { type: "integer", minimum: 1, maximum: 20 },
    ingredients: { type: "array", maxItems: 80,
      items: { type: "string", minLength: 1, maxLength: 240 } },
    instructions: { type: "string", maxLength: 12_000 },
    steps: { type: "array", maxItems: 50, items: {
      type: "object", additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 120 },
        instruction: { type: "string", minLength: 1, maxLength: 2_000 },
        durationMinutes: { type: "integer", minimum: 0, maximum: 1_440 },
        temperature: { type: "string", maxLength: 80 },
        tip: { type: "string", maxLength: 500 },
      },
      required: ["title", "instruction", "durationMinutes", "temperature", "tip"],
    } },
  },
  required: ["name", "time", "servings", "ingredients", "instructions", "steps"],
} as const;

type ScanData = Record<string, unknown>;
type MealDbMatch = { strMealThumb?: unknown; strSource?: unknown };

const prompt = [
  "Read this photographed recipe card, cookbook page, or handwritten recipe.",
  "Extract the exact dish name, total cooking time, servings, complete ingredients with",
  "quantities, and detailed ordered cooking steps. Use four servings only when unstated.",
  "Each step needs a short title, one instruction, whole-minute duration, temperature and",
  "a safety or doneness tip when present. Use zero or an empty string when absent.",
  "Preserve important preparation, temperature, timing, resting and doneness details.",
  "Do not invent missing details.",
].join(" ");

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records: status === 200 ? 1 : 0, status });
  return NextResponse.json(body, { status, headers });
}

function safeUrl(value: unknown, image = false) {
  if (typeof value !== "string" || !value.trim() || value.length > 2_048) return "";
  try {
    const url = new URL(value);
    const approvedImage = !image || url.hostname === "themealdb.com"
      || url.hostname === "www.themealdb.com";
    return url.protocol === "https:" && !url.username && !url.password && approvedImage
      ? url.toString() : "";
  } catch { return ""; }
}

function mealDbMatch(value: unknown): MealDbMatch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const meals = (value as Record<string, unknown>).meals;
  if (!Array.isArray(meals) || !meals[0] || typeof meals[0] !== "object"
    || Array.isArray(meals[0])) return null;
  return meals[0] as MealDbMatch;
}

async function findPhoto(name: string) {
  const key = (process.env.THEMEALDB_API_KEY || "1").trim();
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(key)) return null;
  const response = await fetch(
    `https://www.themealdb.com/api/json/v1/${key}/search.php?s=${encodeURIComponent(name)}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) return null;
  try { return mealDbMatch(await readBoundedJsonResponse(response, 512 * 1024)); }
  catch (error) { if (error instanceof ExternalResponseError) return null; throw error; }
}

function parsedRecipe(scanned: ScanData, match: MealDbMatch | null): KitchenRecipe {
  return parseKitchenRecipe({
    contentComplete: true,
    id: `scanned-${crypto.randomUUID()}`,
    version: 1,
    name: scanned.name,
    time: scanned.time,
    servings: scanned.servings,
    image: safeUrl(match?.strMealThumb, true),
    ingredients: scanned.ingredients,
    instructions: scanned.instructions,
    steps: Array.isArray(scanned.steps) ? scanned.steps.map((value) => {
      const step = value && typeof value === "object" && !Array.isArray(value)
        ? value as ScanData : {};
      return { ...step, durationMinutes: step.durationMinutes === 0 ? null : step.durationMinutes };
    }) : scanned.steps,
    favourite: false,
    source: "scanned",
    sourceUrl: safeUrl(match?.strSource) || null,
  });
}

export function OPTIONS(request: Request) { return mobilePreflight(request); }

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "kitchen-recipe-scan", request,
    route: "/api/kitchen/recipes/scan" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond(request, observation,
    { error: "Recipe scanning is unavailable." }, 503, "auth-unavailable");
  if (auth.error || !auth.user) return respond(request, observation,
    { error: "You must be signed in to scan recipes." }, 401, "unauthenticated");
  if (!process.env.OPENAI_API_KEY) return respond(request, observation,
    { error: "Recipe scanning is not configured yet." }, 503, "not-configured");
  const rate = await checkServerRateLimit(createRateLimitKey(
    "api:kitchen:recipe-scan", auth.user.id), { limit: 12, windowMs: 10 * 60_000 });
  if (!rate.allowed) return respond(request, observation,
    { error: "Too many recipe scans. Please wait a moment and try again." }, 429, "rate-limited");

  let file;
  try {
    file = await readBoundedSingleFile(request, { fieldName: "file",
      maximumBytes: MAX_RECIPE_IMAGE_BYTES,
      maximumTransportBytes: MAX_RECIPE_IMAGE_BYTES + 64 * 1024 });
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(request, observation, { error: "Please choose one recipe photo under 4 MB." },
      status, "invalid-upload");
  }
  if (!supportedImages.has(file.mimeType)) return respond(request, observation,
    { error: "Choose a JPEG, PNG or WebP recipe photo." }, 415, "unsupported-image");
  const inspection = inspectCaptureFile({ declaredMimeType: file.mimeType, bytes: file.bytes });
  if (!inspection.ok || !supportedImages.has(inspection.detectedMimeType)) {
    return respond(request, observation,
      { error: "The selected file is not a valid recipe photo." }, 415, "signature-mismatch");
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ai = await client.responses.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5",
      input: [{ role: "user", content: [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: `data:${inspection.detectedMimeType};base64,${Buffer.from(file.bytes).toString("base64")}`,
          detail: "high" },
      ] }],
      text: { format: { type: "json_schema", name: "diarydock_recipe_scan",
        schema: recipeSchema, strict: true } },
    }, { signal: AbortSignal.timeout(45_000) });
    if (!ai.output_text || Buffer.byteLength(ai.output_text, "utf8") > 128 * 1024) {
      return respond(request, observation,
        { error: "No recipe could be read from that photo." }, 422, "empty-result");
    }
    const scanned = JSON.parse(ai.output_text) as ScanData;
    const validated = parsedRecipe(scanned, null);
    const match = await findPhoto(validated.name).catch(() => null);
    const recipe = match ? parsedRecipe(scanned, match) : validated;
    return respond(request, observation,
      { recipe, matchedPhoto: Boolean(recipe.image) }, 200, "ok");
  } catch {
    return respond(request, observation,
      { error: "The recipe could not be read right now." }, 502, "provider-unavailable");
  }
}
