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

export function text(
  value: unknown,
  label: string,
  maximum: number,
  allowEmpty = false,
) {
  if (typeof value !== "string" || value.length > maximum
    || (!allowEmpty && !value.trim())) throw new Error(`${label} is invalid.`);
  return value.trim();
}

export function optionalText(value: unknown, label: string, maximum: number) {
  return value === null ? null : text(value, label, maximum);
}

export function finiteNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)
    || value < minimum || value > maximum) throw new Error(`${label} is invalid.`);
  return value;
}

export function nullableInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return Number(value);
}

export function date(value: unknown, label: string, allowEmpty = true) {
  const parsed = text(value, label, 10, allowEmpty);
  if (parsed && !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw new Error(`${label} is invalid.`);
  return parsed;
}

export function list(value: unknown, label: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} is invalid.`);
  return value;
}

export function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} is invalid.`);
  return value;
}
