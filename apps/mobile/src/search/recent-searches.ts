import { type OfflineStore, tryGetReadModel, tryPutReadModel } from "@diarydock/offline-store";

const CACHE_KEY = "recent-searches";
const SCHEMA_VERSION = 1;

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => (
    typeof item === "string" && Boolean(item.trim()) && item.length <= 80
  )).slice(0, 6);
}

export async function loadRecentSearches(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached || cached.schemaVersion !== SCHEMA_VERSION) return [];
  return parseItems(cached.payload.items);
}

export async function rememberSearch(store: OfflineStore, current: string[], query: string) {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!normalized) return current;
  const next = [normalized, ...current.filter((item) => (
    item.toLocaleLowerCase("en-GB") !== normalized.toLocaleLowerCase("en-GB")
  ))].slice(0, 6);
  await tryPutReadModel(store, CACHE_KEY, SCHEMA_VERSION, { items: next });
  return next;
}
