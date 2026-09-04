import type { JsonObject } from "@diarydock/contracts";

const entityPattern = /^[a-z][a-z0-9-]{0,63}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertEntityType(value: string) {
  if (!entityPattern.test(value)) throw new Error("The record type is invalid.");
  return value;
}

export function assertRecordId(value: string) {
  if (!uuidPattern.test(value)) throw new Error("The record identifier is invalid.");
  return value;
}

export function assertSchemaVersion(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    throw new Error("The record schema version is invalid.");
  }
  return value;
}

export function serializePayload(payload: JsonObject) {
  const serialized = JSON.stringify(payload);
  if (serialized.length > 256_000) throw new Error("The offline record is too large.");
  return serialized;
}

export function parsePayload(value: unknown): JsonObject {
  if (typeof value !== "string") throw new Error("The offline record payload is invalid.");
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The offline record payload is invalid.");
  }
  return parsed as JsonObject;
}

export function boundedLimit(value: number, maximum: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`The requested limit must be between 1 and ${maximum}.`);
  }
  return value;
}
