export const SEARCH_SCHEMA_VERSION = 1;

export const searchCategories = [
  "all", "documents", "reminders", "home", "vehicles", "pets",
  "travel", "insurance", "contacts", "assets",
] as const;
export type SearchCategory = (typeof searchCategories)[number];
export type SearchResultCategory = Exclude<SearchCategory, "all">;

export const searchDateFilters = ["all", "30", "90", "expired"] as const;
export type SearchDateFilter = (typeof searchDateFilters)[number];

export type SearchCandidate = {
  id: string;
  category: SearchResultCategory;
  domains: SearchResultCategory[];
  title: string;
  detail: string;
  href: string;
  dueAt?: string;
  badge?: string;
  searchText: string;
  updatedAt?: string;
};

export type SearchResult = Omit<SearchCandidate, "domains" | "searchText" | "updatedAt">;

export type SearchResponse = {
  schemaVersion: typeof SEARCH_SCHEMA_VERSION;
  query: string;
  filters: { category: SearchCategory; date: SearchDateFilter };
  results: SearchResult[];
};

export type AskCitation = SearchResult & { ref?: string };
export type AskEvidenceCitation = SearchResult & { ref: string };

export type AskResponse = {
  schemaVersion: typeof SEARCH_SCHEMA_VERSION;
  answer: string;
  citations: AskCitation[];
  usedAI: boolean;
};
