type UnknownRecord = Record<string, unknown>;

export function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as UnknownRecord;
}

export function exact(value: UnknownRecord, keys: string[], label: string) {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new Error(`${label} contains unsupported information.`);
  }
}

export function text(value: unknown, label: string, maximum: number, empty = false) {
  if (typeof value !== "string" || value.length > maximum || (!empty && !value.trim())) {
    throw new Error(`${label} is invalid.`);
  }
  return value.trim();
}

export function identifier(value: unknown, label = "Record ID") {
  return text(value, label, 128);
}

export function revision(value: unknown) {
  return value === null ? null : text(value, "Travel revision", 40);
}

export function oneOf<const Values extends readonly string[]>(
  value: unknown, values: Values, label: string,
): Values[number] {
  if (!values.includes(value as never)) throw new Error(`${label} is invalid.`);
  return value as Values[number];
}

export function list(value: unknown, label: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

export function number(value: unknown, label: string, minimum = 0, maximum = 100_000_000) {
  if (typeof value !== "number" || !Number.isFinite(value)
    || value < minimum || value > maximum) throw new Error(`${label} is invalid.`);
  return value;
}

export function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} is invalid.`);
  return value;
}

export function date(value: unknown, label: string, empty = false) {
  const parsed = text(value, label, 10, empty);
  if (parsed && !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw new Error(`${label} is invalid.`);
  return parsed;
}

export function dateTime(value: unknown, label: string, empty = false) {
  const parsed = text(value, label, 40, empty);
  if (parsed && !Number.isFinite(Date.parse(parsed))) throw new Error(`${label} is invalid.`);
  return parsed;
}

export function time(value: unknown, label: string, empty = false) {
  const parsed = text(value, label, 5, empty);
  if (parsed && !/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed)) {
    throw new Error(`${label} is invalid.`);
  }
  return parsed;
}

export function currency(value: unknown, label = "Currency") {
  const parsed = text(value, label, 3);
  if (!/^[A-Z]{3}$/.test(parsed)) throw new Error(`${label} is invalid.`);
  return parsed;
}

export function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates.`);
}
