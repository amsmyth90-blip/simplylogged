import type { SearchCandidate } from "@/lib/search/results";

export type UnknownRecord = Record<string, unknown>;

export const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};

export const asArray = (value: unknown) =>
  Array.isArray(value) ? value.map(asRecord) : [];

export const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const stringParts = (...values: unknown[]) =>
  values.map(text).filter(Boolean).join(" ");

export const validDate = (value: unknown) => {
  const raw = text(value);
  if (!raw) return undefined;

  const parsed = Date.parse(raw.includes("T") ? raw : `${raw}T09:00:00.000Z`);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};

export function addDatedCandidate(
  candidates: SearchCandidate[],
  input: {
    id: string;
    category: SearchCandidate["category"];
    domains: SearchCandidate["domains"];
    title: string;
    detail: string;
    href: string;
    dueAt: unknown;
    badge: string;
    searchText: string;
    updatedAt?: unknown;
  },
) {
  const dueAt = validDate(input.dueAt);
  if (!dueAt) return;

  candidates.push({
    ...input,
    dueAt,
    updatedAt: text(input.updatedAt),
  });
}
