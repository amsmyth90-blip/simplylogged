import {
  ContractValidationError,
  readArray,
  readBoolean,
  readEnum,
  readInteger,
  readNullableString,
  readObject,
  readString,
} from "./validation.ts";

export const SYNC_API_VERSION = "2026-09-01" as const;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const revisionPattern = /^(0|[1-9][0-9]{0,19})$/;
const entityTypePattern = /^[a-z][a-z0-9-]{0,63}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export type SyncScope = {
  kind: "USER" | "HOUSEHOLD";
  id: string;
};

export type SyncRecord = {
  id: string;
  entityType: string;
  scope: SyncScope;
  revision: string;
  schemaVersion: number;
  updatedAt: string;
  deletedAt: string | null;
  payload: JsonObject;
};

export type SyncPullResponse = {
  apiVersion: typeof SYNC_API_VERSION;
  records: SyncRecord[];
  nextCursor: string | null;
  hasMore: boolean;
  activeHouseholdId: string | null;
};

export type SyncMutation = {
  idempotencyKey: string;
  recordId: string;
  entityType: string;
  operation: "UPSERT" | "DELETE";
  expectedRevision: string | null;
  schemaVersion: number;
  payload: JsonObject;
};

export type SyncPushRequest = {
  apiVersion: typeof SYNC_API_VERSION;
  deviceId: string;
  batchId: string;
  mutations: SyncMutation[];
};

function readApiVersion(value: unknown, path: string) {
  if (value !== SYNC_API_VERSION) {
    throw new ContractValidationError(path, `must be ${SYNC_API_VERSION}.`);
  }
  return SYNC_API_VERSION;
}

function readJsonObject(value: unknown, path: string, depth = 0): JsonObject {
  if (depth > 20) throw new ContractValidationError(path, "is nested too deeply.");
  const object = readObject(value, path);
  const entries = Object.entries(object);
  if (entries.length > 200) throw new ContractValidationError(path, "has too many fields.");

  return Object.fromEntries(entries.map(([key, entry]) => {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)) {
      throw new ContractValidationError(`${path}.${key}`, "has an invalid field name.");
    }
    return [key, readJsonValue(entry, `${path}.${key}`, depth + 1)];
  }));
}

function readJsonValue(value: unknown, path: string, depth: number): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 500) throw new ContractValidationError(path, "has too many items.");
    return value.map((entry, index) => readJsonValue(entry, `${path}[${index}]`, depth + 1));
  }
  return readJsonObject(value, path, depth);
}

function readScope(value: unknown, path: string): SyncScope {
  const object = readObject(value, path);
  return {
    kind: readEnum(object.kind, `${path}.kind`, ["USER", "HOUSEHOLD"]),
    id: readString(object.id, `${path}.id`, { maximum: 36, pattern: uuidPattern }),
  };
}

export function parseSyncRecord(value: unknown, path = "record"): SyncRecord {
  const object = readObject(value, path);
  return {
    id: readString(object.id, `${path}.id`, { maximum: 36, pattern: uuidPattern }),
    entityType: readString(object.entityType, `${path}.entityType`, { maximum: 64, pattern: entityTypePattern }),
    scope: readScope(object.scope, `${path}.scope`),
    revision: readString(object.revision, `${path}.revision`, { maximum: 20, pattern: revisionPattern }),
    schemaVersion: readInteger(object.schemaVersion, `${path}.schemaVersion`, 1, 10_000),
    updatedAt: readString(object.updatedAt, `${path}.updatedAt`, { maximum: 32, pattern: timestampPattern }),
    deletedAt: readNullableString(object.deletedAt, `${path}.deletedAt`, { maximum: 32, pattern: timestampPattern }),
    payload: readJsonObject(object.payload, `${path}.payload`),
  };
}

function readMutation(value: unknown, path: string): SyncMutation {
  const object = readObject(value, path);
  const operation = readEnum(object.operation, `${path}.operation`, ["UPSERT", "DELETE"]);
  const payload = readJsonObject(object.payload, `${path}.payload`);
  if (operation === "DELETE" && Object.keys(payload).length) {
    throw new ContractValidationError(`${path}.payload`, "must be empty for a deletion.");
  }

  return {
    idempotencyKey: readString(object.idempotencyKey, `${path}.idempotencyKey`, { maximum: 36, pattern: uuidPattern }),
    recordId: readString(object.recordId, `${path}.recordId`, { maximum: 36, pattern: uuidPattern }),
    entityType: readString(object.entityType, `${path}.entityType`, { maximum: 64, pattern: entityTypePattern }),
    operation,
    expectedRevision: readNullableString(object.expectedRevision, `${path}.expectedRevision`, { maximum: 20, pattern: revisionPattern }),
    schemaVersion: readInteger(object.schemaVersion, `${path}.schemaVersion`, 1, 10_000),
    payload,
  };
}

export function parseSyncPullResponse(value: unknown): SyncPullResponse {
  const object = readObject(value, "response");
  const records = readArray(object.records, "response.records", 500)
    .map((record, index) => parseSyncRecord(record, `response.records[${index}]`));
  return {
    apiVersion: readApiVersion(object.apiVersion, "response.apiVersion"),
    records,
    nextCursor: readNullableString(object.nextCursor, "response.nextCursor", { maximum: 2_048 }),
    hasMore: readBoolean(object.hasMore, "response.hasMore"),
    activeHouseholdId: readNullableString(
      object.activeHouseholdId,
      "response.activeHouseholdId",
      { maximum: 36, pattern: uuidPattern },
    ),
  };
}

export function parseSyncPushRequest(value: unknown): SyncPushRequest {
  const object = readObject(value, "request");
  const mutations = readArray(object.mutations, "request.mutations", 100)
    .map((mutation, index) => readMutation(mutation, `request.mutations[${index}]`));
  if (!mutations.length) throw new ContractValidationError("request.mutations", "must not be empty.");
  const idempotencyKeys = new Set(mutations.map((mutation) => mutation.idempotencyKey));
  if (idempotencyKeys.size !== mutations.length) {
    throw new ContractValidationError("request.mutations", "contains duplicate idempotency keys.");
  }

  return {
    apiVersion: readApiVersion(object.apiVersion, "request.apiVersion"),
    deviceId: readString(object.deviceId, "request.deviceId", { maximum: 36, pattern: uuidPattern }),
    batchId: readString(object.batchId, "request.batchId", { maximum: 36, pattern: uuidPattern }),
    mutations,
  };
}
