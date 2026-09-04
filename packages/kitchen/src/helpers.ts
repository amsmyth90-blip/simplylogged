export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

export function exact(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error(`${label} contains unsupported information.`);
  }
}

export function text(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const clean = value.trim();
  if (!clean || clean.length > maximum) throw new Error(`${label} is invalid.`);
  return clean;
}

export function optionalText(value: unknown, label: string, maximum: number) {
  if (value === undefined) return undefined;
  return text(value, label, maximum);
}

export function array(value: unknown, label: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} is invalid.`);
  return value;
}

export function revision(value: unknown) {
  if (value === null) return null;
  const clean = text(value, "Kitchen revision", 40);
  if (!Number.isFinite(Date.parse(clean))) throw new Error("Kitchen revision is invalid.");
  return clean;
}
