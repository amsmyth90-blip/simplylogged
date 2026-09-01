export const GUARDIAN_RULE_VERSION = 1;

export type GuardianSeverity = "INFO" | "ATTENTION" | "IMPORTANT" | "URGENT";

export type GuardianSource = {
  resourceType: string;
  resourceId: string;
  dateKey: string;
  reminderType: string;
  title: string;
  dueAt: string;
  timeZone?: string;
};

export type GuardianCandidate = {
  dedupeKey: string;
  type: string;
  severity: GuardianSeverity;
  resourceType: string;
  resourceId: string;
  title: string;
  description: string;
  dueAt: string;
  ruleVersion: number;
};

function calendarDay(value: string | Date, timeZone: string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
}

export function guardianDaysUntil(dueAt: string, now = new Date(), timeZone = "Europe/London") {
  const target = calendarDay(dueAt, timeZone);
  const today = calendarDay(now, timeZone);
  return Math.round((target - today) / 86_400_000);
}

function severityForDays(days: number): GuardianSeverity {
  if (days < -30) return "URGENT";
  if (days <= 7) return "IMPORTANT";
  if (days <= 30) return "ATTENTION";
  return "INFO";
}

function calmDescription(days: number) {
  if (days < 0) return `The recorded date passed ${Math.abs(days)} day${days === -1 ? "" : "s"} ago. Check whether it has already been sorted.`;
  if (days === 0) return "The recorded date is today. Check the source record when convenient.";
  if (days === 1) return "The recorded date is tomorrow.";
  return `The recorded date is in ${days} days.`;
}

export function evaluateGuardianSource(source: GuardianSource, now = new Date()): GuardianCandidate | null {
  const dueTime = Date.parse(source.dueAt);
  if (!Number.isFinite(dueTime)) return null;
  let days: number;
  try {
    days = guardianDaysUntil(source.dueAt, now, source.timeZone);
  } catch {
    return null;
  }
  if (days > 90) return null;
  return {
    dedupeKey: `${source.resourceType}:${source.resourceId}:${source.dateKey}`,
    type: source.reminderType || source.dateKey,
    severity: severityForDays(days),
    resourceType: source.resourceType,
    resourceId: source.resourceId,
    title: source.title,
    description: calmDescription(days),
    dueAt: new Date(dueTime).toISOString(),
    ruleVersion: GUARDIAN_RULE_VERSION
  };
}

export function evaluateGuardianSources(sources: GuardianSource[], now = new Date()) {
  const candidates = sources
    .map((source) => evaluateGuardianSource(source, now))
    .filter((candidate): candidate is GuardianCandidate => Boolean(candidate));
  return [...new Map(candidates.map((candidate) => [candidate.dedupeKey, candidate])).values()]
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}
