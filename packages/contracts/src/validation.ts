export class ContractValidationError extends Error {
  readonly code = "INVALID_CONTRACT";

  constructor(path: string, expectation: string) {
    super(`${path} ${expectation}`);
    this.name = "ContractValidationError";
  }
}

export function readObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractValidationError(path, "must be an object.");
  }
  return value as Record<string, unknown>;
}

export function readString(
  value: unknown,
  path: string,
  options: { maximum: number; pattern?: RegExp },
) {
  if (typeof value !== "string" || value.length < 1 || value.length > options.maximum) {
    throw new ContractValidationError(path, `must be between 1 and ${options.maximum} characters.`);
  }
  if (options.pattern && !options.pattern.test(value)) {
    throw new ContractValidationError(path, "has an invalid format.");
  }
  return value;
}

export function readNullableString(
  value: unknown,
  path: string,
  options: { maximum: number; pattern?: RegExp },
) {
  return value === null ? null : readString(value, path, options);
}

export function readInteger(value: unknown, path: string, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new ContractValidationError(path, `must be an integer from ${minimum} to ${maximum}.`);
  }
  return Number(value);
}

export function readBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") {
    throw new ContractValidationError(path, "must be a boolean.");
  }
  return value;
}

export function readArray(value: unknown, path: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new ContractValidationError(path, `must be an array with at most ${maximum} items.`);
  }
  return value;
}

export function readEnum<const T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ContractValidationError(path, `must be one of ${allowed.join(", ")}.`);
  }
  return value as T;
}
