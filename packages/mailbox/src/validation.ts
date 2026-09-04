export function record(value: unknown, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} is invalid.`);
  }
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

export function oneOf<Value extends string>(
  value: unknown,
  values: readonly Value[],
  name: string,
) {
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

export function identifier(value: unknown, name: string): string;
export function identifier(value: unknown, name: string, nullable: true): string | null;
export function identifier(value: unknown, name: string, nullable = false) {
  if (nullable && value === null) return null;
  return text(value, name, 180);
}
