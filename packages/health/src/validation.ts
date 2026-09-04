export type JsonRecord = Record<string, unknown>;

export function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

export function exact(value: JsonRecord, keys: string[], label: string) {
  const expected = new Set(keys);
  if (Object.keys(value).some((key) => !expected.has(key))) {
    throw new Error(`${label} has unsupported fields.`);
  }
}

export function text(value: unknown, label: string, maximum: number, optional = false) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const result = value.trim();
  if ((!optional && !result) || result.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return result;
}

export function list(value: unknown, label: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

export function optionalText(value: unknown, label: string, maximum: number) {
  return value === undefined ? undefined : text(value, label, maximum);
}

export function revision(value: unknown) {
  return value === null ? null : text(value, "Revision", 80);
}

export function date(value: unknown, label: string, optional = true) {
  const result = text(value, label, 10, optional);
  if (result && !/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    throw new Error(`${label} is invalid.`);
  }
  return result;
}

export function timestamp(value: unknown, label: string, optional = false) {
  const result = text(value, label, 40, optional);
  if (result && !Number.isFinite(Date.parse(result))) {
    throw new Error(`${label} is invalid.`);
  }
  return result;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (!allowed.includes(value as T)) throw new Error(`${label} is invalid.`);
  return value as T;
}

export function optionalNumber(value: unknown, label: string, maximum: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}
