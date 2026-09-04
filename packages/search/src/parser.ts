import {
  SEARCH_SCHEMA_VERSION,
  searchCategories,
  searchDateFilters,
  type AskCitation,
  type AskResponse,
  type SearchCategory,
  type SearchDateFilter,
  type SearchResponse,
  type SearchResult,
  type SearchResultCategory,
} from "./types.ts";

const categories = new Set<SearchCategory>(searchCategories);
const resultCategories = new Set<SearchResultCategory>(
  searchCategories.filter((item) => item !== "all") as SearchResultCategory[],
);
const dateFilters = new Set<SearchDateFilter>(searchDateFilters);

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error(`${label} contains unsupported fields.`);
  }
}

function text(value: unknown, label: string, maximum: number, allowEmpty = false) {
  if (typeof value !== "string" || value.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  const normalized = value.trim();
  if (!normalized && !allowEmpty) throw new Error(`${label} is invalid.`);
  return normalized;
}

function optionalText(value: unknown, label: string, maximum: number) {
  return value === undefined ? undefined : text(value, label, maximum);
}

function category(value: unknown): SearchResultCategory {
  if (typeof value !== "string" || !resultCategories.has(value as SearchResultCategory)) {
    throw new Error("Search result category is invalid.");
  }
  return value as SearchResultCategory;
}

function href(value: unknown) {
  const path = text(value, "Search result link", 300);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Search result link is invalid.");
  }
  return path;
}

function optionalDate(value: unknown) {
  const date = optionalText(value, "Search result date", 40);
  if (date && !Number.isFinite(Date.parse(date))) throw new Error("Search result date is invalid.");
  return date;
}

function result(value: unknown, allowRef = false): SearchResult {
  const item = record(value, "Search result");
  exactKeys(
    item,
    allowRef
      ? ["id", "category", "title", "detail", "href", "dueAt", "badge", "ref"]
      : ["id", "category", "title", "detail", "href", "dueAt", "badge"],
    "Search result",
  );
  return {
    id: text(item.id, "Search result ID", 200),
    category: category(item.category),
    title: text(item.title, "Search result title", 240),
    detail: text(item.detail, "Search result detail", 500, true),
    href: href(item.href),
    dueAt: optionalDate(item.dueAt),
    badge: optionalText(item.badge, "Search result badge", 80),
  };
}

function citation(value: unknown): AskCitation {
  const item = record(value, "Ask citation");
  const parsed = result(item, true);
  const ref = optionalText(item.ref, "Citation reference", 8);
  if (ref && !/^S[1-8]$/.test(ref)) throw new Error("Citation reference is invalid.");
  return { ...parsed, ref };
}

function schemaVersion(value: unknown): typeof SEARCH_SCHEMA_VERSION {
  if (value !== SEARCH_SCHEMA_VERSION) throw new Error("Please update DiaryDock to use search.");
  return SEARCH_SCHEMA_VERSION;
}

export function parseSearchResponse(value: unknown): SearchResponse {
  const item = record(value, "Search response");
  exactKeys(item, ["schemaVersion", "query", "filters", "results"], "Search response");
  const filters = record(item.filters, "Search filters");
  exactKeys(filters, ["category", "date"], "Search filters");
  if (!Array.isArray(item.results) || item.results.length > 50) {
    throw new Error("Search results are invalid.");
  }
  if (!categories.has(filters.category as SearchCategory)
    || !dateFilters.has(filters.date as SearchDateFilter)) {
    throw new Error("Search filters are invalid.");
  }
  return {
    schemaVersion: schemaVersion(item.schemaVersion),
    query: text(item.query, "Search query", 80, true),
    filters: {
      category: filters.category as SearchCategory,
      date: filters.date as SearchDateFilter,
    },
    results: item.results.map((entry) => result(entry)),
  };
}

export function parseAskResponse(value: unknown): AskResponse {
  const item = record(value, "Ask response");
  exactKeys(item, ["schemaVersion", "answer", "citations", "usedAI"], "Ask response");
  if (!Array.isArray(item.citations) || item.citations.length > 8) {
    throw new Error("Ask citations are invalid.");
  }
  if (typeof item.usedAI !== "boolean") throw new Error("Ask response is invalid.");
  return {
    schemaVersion: schemaVersion(item.schemaVersion),
    answer: text(item.answer, "Ask answer", 1_200),
    citations: item.citations.map(citation),
    usedAI: item.usedAI,
  };
}
