import {
  parseKitchenPlanningSnapshot,
  parseKitchenRecipeDetail,
  type KitchenPlanningMutation,
  type KitchenRecipeDetail,
  type KitchenPlanningSnapshot,
} from "@diarydock/kitchen";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type KitchenPlanningDraftMutation = KitchenPlanningMutation extends infer Mutation
  ? Mutation extends KitchenPlanningMutation ? Omit<Mutation, "revision"> : never
  : never;

export class KitchenPlanningConflictError extends Error {
  readonly snapshot: KitchenPlanningSnapshot;
  constructor(snapshot: KitchenPlanningSnapshot) {
    super("Kitchen planning changed on another device.");
    this.name = "KitchenPlanningConflictError";
    this.snapshot = snapshot;
  }
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function message(value: unknown, fallback: string) {
  const error = record(value)?.error;
  return typeof error === "string" && error.length <= 240 ? error : fallback;
}

async function request(accessToken: string, init?: RequestInit) {
  const response = await fetch(new URL("/api/mobile/kitchen/planning", getSecureRuntime().apiOrigin), {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(accessToken),
      ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    signal: requestDeadline(20_000),
  });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  const body = record(payload);
  if (response.status === 409 && body?.snapshot) {
    throw new KitchenPlanningConflictError(parseKitchenPlanningSnapshot(body.snapshot));
  }
  if (!response.ok) throw new Error(message(payload, "Kitchen planning is unavailable."));
  if (!init?.body) return { snapshot: parseKitchenPlanningSnapshot(payload), addedCount: 0 };
  if (!body || Object.keys(body).some((key) => key !== "snapshot" && key !== "addedCount")
    || !Number.isSafeInteger(body.addedCount) || Number(body.addedCount) < 0
    || Number(body.addedCount) > 300) throw new Error("Kitchen planning returned an invalid response.");
  return { snapshot: parseKitchenPlanningSnapshot(body.snapshot), addedCount: Number(body.addedCount) };
}

export async function loadMobileKitchenPlanning(accessToken: string) {
  return (await request(accessToken)).snapshot;
}

export async function loadMobileKitchenRecipe(
  accessToken: string,
  recipeId: string,
): Promise<KitchenRecipeDetail> {
  const url = new URL(
    "/api/mobile/kitchen/planning",
    getSecureRuntime().apiOrigin,
  );
  url.searchParams.set("recipeId", recipeId);
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
    },
    signal: requestDeadline(20_000),
  });
  const payload = await readBoundedJsonResponse(response, 512 * 1024);
  if (!response.ok) {
    throw new Error(message(payload, "This recipe is unavailable."));
  }
  return parseKitchenRecipeDetail(payload);
}

export function mutateMobileKitchenPlanning(
  accessToken: string,
  mutation: KitchenPlanningDraftMutation,
  revision: string | null,
) {
  return request(accessToken, { method: "POST", body: JSON.stringify({ ...mutation, revision }) });
}
