import type {
  JsonObject,
  SyncMutation,
  SyncPushResult,
  SyncRecord,
} from "@diarydock/contracts";

export type LocalSyncState = "CLEAN" | "CONFLICT" | "PENDING";

export type LocalRecord = SyncRecord & {
  syncState: LocalSyncState;
};

export type RecordQuery = {
  entityType: string;
  includeDeleted?: boolean;
  limit?: number;
};

export type StageMutationInput = {
  recordId: string;
  entityType: string;
  operation: "UPSERT" | "DELETE";
  expectedRevision: string | null;
  schemaVersion: number;
  payload: JsonObject;
};

export type PendingMutation = SyncMutation & {
  sequence: number;
  createdAt: string;
  attemptCount: number;
  retryAfter: string | null;
  state: "BLOCKED" | "IN_FLIGHT" | "QUEUED";
  batchId: string | null;
  errorCode: string | null;
};

export type SyncConflict = {
  idempotencyKey: string;
  recordId: string;
  entityType: string;
  localOperation: "UPSERT" | "DELETE";
  localSchemaVersion: number;
  localPayload: JsonObject;
  serverRecord: SyncRecord;
  detectedAt: string;
};

export type ConflictResolution = "KEEP_LOCAL" | "USE_SERVER";

export type SyncFailure = {
  idempotencyKey: string;
  recordId: string;
  entityType: string;
  errorCode: string;
  detectedAt: string;
};

export type CacheFileInput = {
  documentId: string;
  version: string;
  mimeType: string;
  bytes: Uint8Array;
  sha256: string;
};

export type CachedFile = CacheFileInput & {
  cachedAt: string;
};

export type CachedReadModel = {
  key: string;
  schemaVersion: number;
  payload: JsonObject;
  updatedAt: string;
};

export type PendingCaptureField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
};

export type PendingDocumentDetails = {
  issuer?: string;
  dueDate?: string;
  summary?: string;
  extractedText?: string;
  confidence?: number;
  actionItems?: string[];
  captureJobId?: string;
  confirmedFields?: PendingCaptureField[];
  reminder?: {
    id: string;
    title: string;
    timeLabel: string;
  };
};

export type PendingDocumentUploadInput = {
  jobId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  sha256: string;
  title: string;
  category: string;
  roomId?: string;
  roomName?: string;
  details?: PendingDocumentDetails;
};

export type PendingDocumentUploadSummary = Omit<PendingDocumentUploadInput, "bytes"> & {
  byteLength: number;
  state: "FAILED" | "IN_FLIGHT" | "QUEUED";
  attemptCount: number;
  retryAfter: string | null;
  errorCode: string | null;
  createdAt: string;
};

export type PendingDocumentUpload = PendingDocumentUploadSummary & {
  bytes: Uint8Array;
};

export type ReleaseDocumentUploadInput = {
  jobId: string;
  errorCode: string;
  retryAfter: string | null;
  permanent: boolean;
};

export interface OfflineStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  clear(): Promise<void>;
  getRecord(entityType: string, recordId: string): Promise<LocalRecord | null>;
  listRecords(query: RecordQuery): Promise<LocalRecord[]>;
  stageMutation(input: StageMutationInput): Promise<PendingMutation>;
  claimPendingBatch(batchId: string, limit: number): Promise<PendingMutation[]>;
  releasePendingBatch(batchId: string, retryAfter: string | null): Promise<void>;
  applyRemoteBatch(
    records: SyncRecord[],
    nextCursor: string | null,
    activeHouseholdId: string | null,
  ): Promise<void>;
  applyPushResults(batchId: string, results: SyncPushResult[]): Promise<void>;
  getCursor(): Promise<string | null>;
  listConflicts(): Promise<SyncConflict[]>;
  listFailures(): Promise<SyncFailure[]>;
  resolveConflict(idempotencyKey: string, resolution: ConflictResolution): Promise<void>;
  cacheFile(input: CacheFileInput): Promise<void>;
  getCachedFile(documentId: string, version: string): Promise<CachedFile | null>;
  removeCachedFile(documentId: string): Promise<void>;
  getReadModel(key: string): Promise<CachedReadModel | null>;
  putReadModel(key: string, schemaVersion: number, payload: JsonObject): Promise<void>;
  removeReadModel(key: string): Promise<void>;
  stageDocumentUpload(input: PendingDocumentUploadInput): Promise<void>;
  listDocumentUploads(): Promise<PendingDocumentUploadSummary[]>;
  claimNextDocumentUpload(): Promise<PendingDocumentUpload | null>;
  releaseDocumentUpload(input: ReleaseDocumentUploadInput): Promise<void>;
  retryDocumentUpload(jobId: string): Promise<void>;
  completeDocumentUpload(jobId: string): Promise<void>;
}
