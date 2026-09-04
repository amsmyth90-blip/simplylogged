import {
  ContractValidationError,
  readArray,
  readEnum,
  readObject,
  readString,
} from "./validation.ts";
import {
  SYNC_API_VERSION,
  parseSyncRecord,
  type SyncRecord,
} from "./sync.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SyncPushErrorCode =
  | "FORBIDDEN"
  | "INVALID_MUTATION"
  | "RETRY_LATER"
  | "UNSUPPORTED_SCHEMA";

export type SyncPushResult = {
  idempotencyKey: string;
  status: "APPLIED" | "CONFLICT" | "REJECTED";
  record: SyncRecord | null;
  errorCode: SyncPushErrorCode | null;
};

export type SyncPushResponse = {
  apiVersion: typeof SYNC_API_VERSION;
  batchId: string;
  results: SyncPushResult[];
};

function parseResult(value: unknown, path: string): SyncPushResult {
  const object = readObject(value, path);
  const status = readEnum(object.status, `${path}.status`, ["APPLIED", "CONFLICT", "REJECTED"]);
  const record = object.record === null ? null : parseSyncRecord(object.record, `${path}.record`);
  const errorCode = object.errorCode === null
    ? null
    : readEnum(object.errorCode, `${path}.errorCode`, [
      "FORBIDDEN",
      "INVALID_MUTATION",
      "RETRY_LATER",
      "UNSUPPORTED_SCHEMA",
    ]);

  if ((status === "APPLIED" || status === "CONFLICT") && !record) {
    throw new ContractValidationError(`${path}.record`, `is required for ${status}.`);
  }
  if (status === "REJECTED" && !errorCode) {
    throw new ContractValidationError(`${path}.errorCode`, "is required for REJECTED.");
  }
  if (status !== "REJECTED" && errorCode) {
    throw new ContractValidationError(`${path}.errorCode`, `must be null for ${status}.`);
  }

  return {
    idempotencyKey: readString(object.idempotencyKey, `${path}.idempotencyKey`, {
      maximum: 36,
      pattern: uuidPattern,
    }),
    status,
    record,
    errorCode,
  };
}

export function parseSyncPushResponse(value: unknown): SyncPushResponse {
  const object = readObject(value, "response");
  if (object.apiVersion !== SYNC_API_VERSION) {
    throw new ContractValidationError("response.apiVersion", `must be ${SYNC_API_VERSION}.`);
  }
  const results = readArray(object.results, "response.results", 100)
    .map((entry, index) => parseResult(entry, `response.results[${index}]`));
  const keys = new Set(results.map((result) => result.idempotencyKey));
  if (keys.size !== results.length) {
    throw new ContractValidationError("response.results", "contains duplicate idempotency keys.");
  }

  return {
    apiVersion: SYNC_API_VERSION,
    batchId: readString(object.batchId, "response.batchId", { maximum: 36, pattern: uuidPattern }),
    results,
  };
}
