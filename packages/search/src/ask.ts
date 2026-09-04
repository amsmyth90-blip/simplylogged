import type { AskCitation, AskEvidenceCitation, SearchCandidate } from "./types.ts";

const stopWords = new Set([
  "a", "about", "all", "an", "and", "are", "before", "did", "do", "does",
  "for", "from", "have", "i", "in", "is", "it", "me", "my", "of", "on",
  "or", "show", "still", "the", "this", "to", "was", "what", "when",
  "where", "which", "with", "year",
]);

function words(value: string) {
  return value.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, " ").trim()
    .split(/\s+/).filter((word) => word.length > 1 && !stopWords.has(word));
}

function temporalHorizon(question: string, now: Date) {
  const normalized = question.toLocaleLowerCase("en-GB");
  if (/next\s+(three|3)\s+months|next\s+90\s+days/.test(normalized)) return new Date(now.getTime() + 90 * 86_400_000);
  if (/next\s+(six|6)\s+months|next\s+180\s+days/.test(normalized)) return new Date(now.getTime() + 180 * 86_400_000);
  if (/this\s+year/.test(normalized)) return new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
  if (/next\s+month|next\s+30\s+days/.test(normalized)) return new Date(now.getTime() + 30 * 86_400_000);
  return null;
}

function inferredDomains(question: string) {
  const normalized = question.toLocaleLowerCase("en-GB");
  const domains = new Set<string>();
  if (/\b(car|vehicle|mot|road tax)\b/.test(normalized)) domains.add("vehicles");
  if (/\b(pet|dog|cat|vaccine|vaccination|vet)\b/.test(normalized)) domains.add("pets");
  if (/\b(trip|travel|holiday|passport|flight)\b/.test(normalized)) domains.add("travel");
  if (/\b(insurance|policy|cover)\b/.test(normalized)) domains.add("insurance");
  if (/\b(receipt|document|file|certificate|passport|manual)\b/.test(normalized)) domains.add("documents");
  if (/\b(reminder|due|expires?|expiry|renewal?|renewing)\b/.test(normalized)) domains.add("reminders");
  if (/\b(appliance|asset|boiler|washing machine|warranty|guarantee)\b/.test(normalized)) domains.add("assets");
  return domains;
}

export function retrieveAskCitations(
  candidates: SearchCandidate[],
  question: string,
  now = new Date(),
  limit = 8,
): AskEvidenceCitation[] {
  const normalized = question.toLocaleLowerCase("en-GB");
  const queryWords = words(question);
  const dueIntent = /\b(due|expires?|expiry|renewal?|renewing|warranty|guarantee|services?|servicing|sort before)\b/.test(normalized);
  const horizon = temporalHorizon(question, now);
  const domains = inferredDomains(question);
  const ranked = candidates.map((candidate) => {
    const haystack = `${candidate.title} ${candidate.detail} ${candidate.searchText}`.toLocaleLowerCase("en-GB");
    let rank = 0;
    for (const word of queryWords) {
      if (candidate.title.toLocaleLowerCase("en-GB").includes(word)) rank += 8;
      else if (haystack.includes(word)) rank += 3;
    }
    if ([...domains].some((domain) => candidate.domains.includes(domain as SearchCandidate["domains"][number]))) rank += 5;
    if (dueIntent && candidate.dueAt) rank += 6;
    if (horizon && candidate.dueAt) {
      const due = new Date(candidate.dueAt);
      rank += due >= now && due <= horizon ? 14 : -8;
    }
    if (normalized.includes("not reviewed") && candidate.badge === "Review") rank += 12;
    return { candidate, rank };
  }).filter(({ candidate, rank }) => rank > 0 && (!horizon || (
    Boolean(candidate.dueAt) && new Date(candidate.dueAt as string) >= now
      && new Date(candidate.dueAt as string) <= horizon
  ))).sort((left, right) => right.rank - left.rank
    || Date.parse(left.candidate.dueAt || "9999-12-31") - Date.parse(right.candidate.dueAt || "9999-12-31")
    || left.candidate.title.localeCompare(right.candidate.title))
    .slice(0, Math.max(1, Math.min(limit, 8)));
  return ranked.map(({ candidate }, index) => ({
    ref: `S${index + 1}`,
    id: candidate.id,
    category: candidate.category,
    title: candidate.title,
    detail: candidate.detail,
    href: candidate.href,
    dueAt: candidate.dueAt,
    badge: candidate.badge,
  }));
}

export function deterministicAskAnswer(citations: AskCitation[]) {
  if (!citations.length) return "I couldn’t find a DiaryDock record you’re authorised to open that answers that question. Try a more specific name, item, document or date.";
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" });
  const facts = citations.slice(0, 3).map((citation) => citation.dueAt
    ? `${citation.title} is dated ${date.format(new Date(citation.dueAt))}`
    : `${citation.title}${citation.detail ? ` — ${citation.detail}` : ""}`);
  return `${facts.join(". ")}. Open the linked ${facts.length === 1 ? "record" : "records"} to check the source details.`;
}
