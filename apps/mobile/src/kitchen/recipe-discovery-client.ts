import { parseKitchenRecipe, type KitchenRecipe } from "@diarydock/kitchen";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

const acceptedImages = new Set(["image/jpeg", "image/png", "image/webp"]);

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid response.`);
  }
  return value as Record<string, unknown>;
}

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240 ? message : fallback;
}

async function responsePayload(response: Response, fallback: string) {
  const payload = await readBoundedJsonResponse(response, 256 * 1024);
  if (!response.ok) throw new Error(errorMessage(payload, fallback));
  return payload;
}

export async function searchMobileRecipes(accessToken: string, query: string) {
  const clean = query.trim();
  if (clean.length < 2 || clean.length > 80) throw new Error("Enter between 2 and 80 characters.");
  const url = new URL("/api/kitchen/recipes/search", getSecureRuntime().apiOrigin);
  url.searchParams.set("q", clean);
  const response = await fetch(url, { cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(20_000) });
  const body = record(await responsePayload(response, "Recipe search is unavailable."), "Recipe search");
  const allowed = new Set(["recipes", "correctedQuery"]);
  if (Object.keys(body).some((key) => !allowed.has(key)) || !Array.isArray(body.recipes)
    || body.recipes.length > 12) throw new Error("Recipe search returned an invalid response.");
  const correctedQuery = body.correctedQuery === undefined ? null : body.correctedQuery;
  if (correctedQuery !== null && (typeof correctedQuery !== "string" || correctedQuery.length > 80)) {
    throw new Error("Recipe search returned an invalid response.");
  }
  return { recipes: body.recipes.map(parseKitchenRecipe), correctedQuery } as {
    recipes: KitchenRecipe[]; correctedQuery: string | null;
  };
}

export async function scanMobileRecipe(accessToken: string, file: File) {
  if (!acceptedImages.has(file.type) || file.size <= 0 || file.size > 4 * 1024 * 1024) {
    throw new Error("Choose one JPEG, PNG or WebP recipe photo under 4 MB.");
  }
  const form = new FormData(); form.append("file", file, file.name.slice(0, 120));
  const response = await fetch(new URL("/api/kitchen/recipes/scan", getSecureRuntime().apiOrigin), {
    method: "POST", cache: "no-store", body: form,
    headers: { Accept: "application/json", Authorization: authorization(accessToken) },
    signal: requestDeadline(60_000),
  });
  const body = record(await responsePayload(response, "The recipe could not be read."), "Recipe scan");
  if (Object.keys(body).some((key) => key !== "recipe" && key !== "matchedPhoto")
    || typeof body.matchedPhoto !== "boolean") throw new Error("Recipe scan returned an invalid response.");
  return { recipe: parseKitchenRecipe(body.recipe), matchedPhoto: body.matchedPhoto };
}
