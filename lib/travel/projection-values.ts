export type JsonRecord = Record<string, unknown>;

export function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord : {};
}

export function text(value: unknown, maximum: number, fallback = "") {
  return typeof value === "string" ? value.slice(0, maximum).trim() : fallback;
}

export function identifier(value: unknown) {
  return text(value, 128);
}

export function finite(value: unknown, maximum = 100_000_000) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum
    ? value : 0;
}

export function choice<const Values extends readonly string[]>(
  value: unknown, values: Values, fallback: Values[number],
): Values[number] {
  return values.includes(value as never) ? value as Values[number] : fallback;
}

export function date(value: unknown) {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

export function time(value: unknown) {
  const candidate = text(value, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : "";
}

export function dateTime(value: unknown, fallback = "") {
  const candidate = text(value, 40);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : fallback;
}

export function currency(value: unknown) {
  const candidate = text(value, 3).toUpperCase();
  return /^[A-Z]{3}$/.test(candidate) ? candidate : "GBP";
}

export function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}
