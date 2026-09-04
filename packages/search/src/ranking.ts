import type {
  SearchCandidate,
  SearchCategory,
  SearchDateFilter,
  SearchResult,
} from "./types.ts";

function dayDifference(value: string, now: Date) {
  const due = Date.parse(value);
  if (!Number.isFinite(due)) return null;
  return Math.ceil((due - now.getTime()) / 86_400_000);
}

function score(candidate: SearchCandidate, query: string) {
  if (!query) {
    return candidate.updatedAt
      ? Math.max(0, Date.parse(candidate.updatedAt) / 1e12)
      : 0;
  }
  const title = candidate.title.toLocaleLowerCase("en-GB");
  const text = candidate.searchText.toLocaleLowerCase("en-GB");
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (text.includes(query)) return 30;
  return 0;
}

export function filterAndRankSearchResults(
  candidates: SearchCandidate[],
  query: string,
  category: SearchCategory = "all",
  dateFilter: SearchDateFilter = "all",
  now = new Date(),
): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
  return candidates
    .map((candidate) => ({ candidate, rank: score(candidate, normalized) }))
    .filter(({ candidate, rank }) => (
      (!normalized || rank > 0)
      && (category === "all" || candidate.domains.includes(category))
    ))
    .filter(({ candidate }) => {
      if (dateFilter === "all") return true;
      if (!candidate.dueAt) return false;
      const days = dayDifference(candidate.dueAt, now);
      if (days === null) return false;
      if (dateFilter === "expired") return days < 0;
      return days >= 0 && days <= Number(dateFilter);
    })
    .sort((left, right) => (
      right.rank - left.rank
      || Date.parse(left.candidate.dueAt || "9999-12-31")
        - Date.parse(right.candidate.dueAt || "9999-12-31")
      || left.candidate.title.localeCompare(right.candidate.title)
    ))
    .map(({ candidate }) => ({
      id: candidate.id,
      category: candidate.category,
      title: candidate.title,
      detail: candidate.detail,
      href: candidate.href,
      dueAt: candidate.dueAt,
      badge: candidate.badge,
    }));
}
