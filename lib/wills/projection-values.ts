export type JsonRecord = Record<string, unknown>;

export function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function text(value: unknown, maximum: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maximum) || fallback;
}

export function date(value: unknown) {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

export function timestamp(value: unknown, optional = false) {
  const candidate = text(value, 40);
  if (Number.isFinite(Date.parse(candidate))) return candidate;
  return optional ? "" : new Date(0).toISOString();
}

export function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T) {
  return values.includes(value as T) ? value as T : fallback;
}

export function bool(value: unknown) {
  return value === true;
}

export function uniqueText(value: unknown, maximum: number, limit: number) {
  return [...new Set((Array.isArray(value) ? value : [])
    .slice(0, limit)
    .map((entry) => text(entry, maximum))
    .filter(Boolean))];
}
