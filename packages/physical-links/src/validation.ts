export function record(value: unknown, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} is invalid.`);
  return value as Record<string, unknown>;
}

export function exact(value: Record<string, unknown>, keys: readonly string[], name: string) {
  const expected = new Set(keys);
  if (Object.keys(value).some((key) => !expected.has(key))
    || keys.some((key) => !(key in value))) throw new Error(`${name} is invalid.`);
}

export function text(value: unknown, name: string, maximum: number, empty = false) {
  if (typeof value !== "string" || value.length > maximum || (!empty && !value.trim())) {
    throw new Error(`${name} is invalid.`);
  }
  return value.trim();
}

export function uuid(value: unknown, name: string) {
  const result = text(value, name, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(result)) throw new Error(`${name} is invalid.`);
  return result;
}

export function oneOf<Value extends string>(value: unknown, values: readonly Value[], name: string) {
  if (typeof value !== "string" || !values.includes(value as Value)) {
    throw new Error(`${name} is invalid.`);
  }
  return value as Value;
}

export function timestamp(value: unknown, name: string): string;
export function timestamp(value: unknown, name: string, nullable: true): string | null;
export function timestamp(value: unknown, name: string, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

export function date(value: unknown, name: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} is invalid.`);
  }
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

export function revision(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,18})$/.test(value)) {
    throw new Error("Physical Links revision is invalid.");
  }
  return value;
}

export function count(value: unknown, name: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 1_000_000) {
    throw new Error(`${name} is invalid.`);
  }
  return Number(value);
}
