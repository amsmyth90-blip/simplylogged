export function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

export function exact(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error(`${label} contains unsupported fields.`);
}

export function text(value: unknown, label: string, maximum: number, empty = false) {
  if (typeof value !== "string" || value.length > maximum) throw new Error(`${label} is invalid.`);
  const normalized = value.trim();
  if (!normalized && !empty) throw new Error(`${label} is invalid.`);
  return normalized;
}

export function array(value: unknown, label: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} is invalid.`);
  return value;
}

export function date(value: unknown, label: string, nullable = false) {
  if (nullable && value === null) return null;
  const parsed = text(value, label, 40);
  if (!Number.isFinite(Date.parse(parsed))) throw new Error(`${label} is invalid.`);
  return parsed;
}

export function uuid(value: unknown, label: string) {
  const parsed = text(value, label, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed)) {
    throw new Error(`${label} is invalid.`);
  }
  return parsed;
}
