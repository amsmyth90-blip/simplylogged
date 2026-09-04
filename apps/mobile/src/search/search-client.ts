import {
  parseAskResponse,
  parseSearchResponse,
  type SearchCategory,
  type SearchDateFilter,
} from "@diarydock/search";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestSignal } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again.");
  }
  return `Bearer ${accessToken}`;
}

async function payload(response: Response) {
  return readBoundedJsonResponse(response, 128 * 1024);
}

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === "string" && message.length <= 240 ? message : fallback;
}

export async function searchDiaryDock(input: {
  accessToken: string;
  category: SearchCategory;
  date: SearchDateFilter;
  query: string;
  signal: AbortSignal;
}) {
  const url = new URL("/api/mobile/search", getSecureRuntime().apiOrigin);
  url.searchParams.set("q", input.query);
  url.searchParams.set("category", input.category);
  url.searchParams.set("date", input.date);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: authorization(input.accessToken) },
    signal: requestSignal(input.signal),
  });
  const body = await payload(response);
  if (!response.ok) throw new Error(errorMessage(body, "Search is unavailable."));
  return parseSearchResponse(body);
}

export async function askDiaryDock(accessToken: string, question: string) {
  const response = await fetch(new URL("/api/mobile/ask", getSecureRuntime().apiOrigin), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: authorization(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
    signal: requestSignal(undefined, 30_000),
  });
  const body = await payload(response);
  if (!response.ok) throw new Error(errorMessage(body, "Ask DiaryDock is unavailable."));
  return parseAskResponse(body);
}
