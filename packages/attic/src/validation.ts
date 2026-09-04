type JsonRecord = Record<string, unknown>;

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

export function text(
  value: unknown,
  label: string,
  maximum: number,
  optional = false,
) {
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

export function revision(value: unknown) {
  if (value === null) return null;
  return text(value, "Revision", 80);
}

export function timestamp(value: unknown, label: string) {
  const result = text(value, label, 40);
  if (!Number.isFinite(Date.parse(result))) throw new Error(`${label} is invalid.`);
  return result;
}

export function count(value: unknown, label: string, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return Number(value);
}
