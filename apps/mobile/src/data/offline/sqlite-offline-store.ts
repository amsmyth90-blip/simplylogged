import type { JsonObject, SyncPushResult, SyncRecord } from "@diarydock/contracts";
import {
  assertRecordId,
  type CacheFileInput,
  type CachedFile,
  type CachedReadModel,
  type ConflictResolution,
  type LocalRecord,
  type OfflineStore,
  type PendingMutation,
  type PendingDocumentUpload,
  type PendingDocumentUploadInput,
  type PendingDocumentUploadSummary,
  type RecordQuery,
  type ReleaseDocumentUploadInput,
  type StageMutationInput,
  type SyncConflict,
  type SyncFailure,
} from "@diarydock/offline-store";

import {
  openEncryptedOfflineDatabase,
  type OpenOfflineDatabase,
} from "./database";
import { SqliteConflictRepository } from "./conflict-repository";
import { SqliteFileCacheRepository } from "./file-cache-repository";
import { SqlitePendingUploadRepository } from "./pending-upload-repository";
import { SqliteRecordRepository } from "./record-repository";
import { SqliteReadModelRepository } from "./read-model-repository";
import { SqliteSyncRepository } from "./sync-repository";

export class SqliteOfflineStore implements OfflineStore {
  private opened: OpenOfflineDatabase | null = null;
  private records: SqliteRecordRepository | null = null;
  private readModels: SqliteReadModelRepository | null = null;
  private sync: SqliteSyncRepository | null = null;
  private conflicts: SqliteConflictRepository | null = null;
  private files: SqliteFileCacheRepository | null = null;
  private uploads: SqlitePendingUploadRepository | null = null;
  private operation: Promise<void> = Promise.resolve();

  constructor(private readonly accountId: string) {
    assertRecordId(accountId);
  }

  initialize() {
    return this.serialized(async () => {
      if (this.opened) return;
      this.opened = await openEncryptedOfflineDatabase(this.accountId);
      this.records = new SqliteRecordRepository(this.opened.database, this.accountId);
      this.readModels = new SqliteReadModelRepository(this.opened.database);
      this.sync = new SqliteSyncRepository(this.opened.database);
      this.conflicts = new SqliteConflictRepository(this.opened.database);
      this.files = new SqliteFileCacheRepository(this.opened.database);
      this.uploads = new SqlitePendingUploadRepository(this.opened.database);
      await this.sync.recoverInterruptedBatches();
      await this.uploads.recoverInterrupted();
    });
  }

  close() {
    return this.serialized(async () => {
      if (!this.opened) return;
      await this.opened.connection.closeConnection(this.opened.databaseName, false);
      this.reset();
    });
  }

  clear() {
    return this.serialized(async () => {
      if (!this.opened) {
        this.opened = await openEncryptedOfflineDatabase(this.accountId);
      }
      await this.opened.database.delete();
      this.reset();
    });
  }

  getRecord(entityType: string, recordId: string): Promise<LocalRecord | null> {
    return this.serialized(() => this.recordRepository().getRecord(entityType, recordId));
  }

  listRecords(query: RecordQuery): Promise<LocalRecord[]> {
    return this.serialized(() => this.recordRepository().listRecords(query));
  }

  stageMutation(input: StageMutationInput): Promise<PendingMutation> {
    return this.serialized(() => this.recordRepository().stageMutation(input));
  }

  claimPendingBatch(batchId: string, limit: number): Promise<PendingMutation[]> {
    return this.serialized(() => this.syncRepository().claimPendingBatch(batchId, limit));
  }

  releasePendingBatch(batchId: string, retryAfter: string | null) {
    return this.serialized(() => this.syncRepository().releasePendingBatch(batchId, retryAfter));
  }

  applyRemoteBatch(
    records: SyncRecord[],
    nextCursor: string | null,
    activeHouseholdId: string | null,
  ) {
    return this.serialized(() => this.syncRepository().applyRemoteBatch(
      records,
      nextCursor,
      activeHouseholdId,
    ));
  }

  applyPushResults(batchId: string, results: SyncPushResult[]) {
    return this.serialized(() => this.syncRepository().applyPushResults(batchId, results));
  }

  getCursor(): Promise<string | null> {
    return this.serialized(() => this.syncRepository().getCursor());
  }

  listConflicts(): Promise<SyncConflict[]> {
    return this.serialized(() => this.conflictRepository().listConflicts());
  }

  listFailures(): Promise<SyncFailure[]> {
    return this.serialized(() => this.conflictRepository().listFailures());
  }

  resolveConflict(idempotencyKey: string, resolution: ConflictResolution) {
    return this.serialized(() => this.conflictRepository().resolveConflict(idempotencyKey, resolution));
  }

  cacheFile(input: CacheFileInput) {
    return this.serialized(() => this.fileRepository().cacheFile(input));
  }

  getCachedFile(documentId: string, version: string): Promise<CachedFile | null> {
    return this.serialized(() => this.fileRepository().getCachedFile(documentId, version));
  }

  removeCachedFile(documentId: string) {
    return this.serialized(() => this.fileRepository().removeCachedFile(documentId));
  }

  getReadModel(key: string): Promise<CachedReadModel | null> {
    return this.serialized(() => this.readModelRepository().get(key));
  }

  putReadModel(key: string, schemaVersion: number, payload: JsonObject) {
    return this.serialized(() => this.readModelRepository().put(key, schemaVersion, payload));
  }

  removeReadModel(key: string) {
    return this.serialized(() => this.readModelRepository().remove(key));
  }

  stageDocumentUpload(input: PendingDocumentUploadInput) {
    return this.serialized(() => this.uploadRepository().stage(input));
  }

  listDocumentUploads(): Promise<PendingDocumentUploadSummary[]> {
    return this.serialized(() => this.uploadRepository().list());
  }

  claimNextDocumentUpload(): Promise<PendingDocumentUpload | null> {
    return this.serialized(() => this.uploadRepository().claimNext());
  }

  releaseDocumentUpload(input: ReleaseDocumentUploadInput) {
    return this.serialized(() => this.uploadRepository().release(input));
  }

  retryDocumentUpload(jobId: string) {
    return this.serialized(() => this.uploadRepository().retry(jobId));
  }

  completeDocumentUpload(jobId: string) {
    return this.serialized(() => this.uploadRepository().complete(jobId));
  }

  private recordRepository() {
    if (!this.records) throw new Error("Offline storage has not been initialized.");
    return this.records;
  }

  private syncRepository() {
    if (!this.sync) throw new Error("Offline storage has not been initialized.");
    return this.sync;
  }

  private conflictRepository() {
    if (!this.conflicts) throw new Error("Offline storage has not been initialized.");
    return this.conflicts;
  }

  private fileRepository() {
    if (!this.files) throw new Error("Offline storage has not been initialized.");
    return this.files;
  }

  private readModelRepository() {
    if (!this.readModels) throw new Error("Offline storage has not been initialized.");
    return this.readModels;
  }

  private uploadRepository() {
    if (!this.uploads) throw new Error("Offline storage has not been initialized.");
    return this.uploads;
  }

  private reset() {
    this.opened = null;
    this.records = null;
    this.readModels = null;
    this.sync = null;
    this.conflicts = null;
    this.files = null;
    this.uploads = null;
  }

  private serialized<T>(work: () => Promise<T>): Promise<T> {
    const result = this.operation.then(work, work);
    this.operation = result.then(() => undefined, () => undefined);
    return result;
  }
}
