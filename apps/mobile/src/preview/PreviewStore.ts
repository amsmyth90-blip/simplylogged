import type { JsonObject, SyncRecord } from "@diarydock/contracts";
import type {
  ConflictResolution,
  LocalRecord,
  OfflineStore,
  PendingMutation,
  RecordQuery,
  StageMutationInput,
} from "@diarydock/offline-store";

import {
  initialConflicts,
  initialRecords,
  ownerId,
} from "./reminder-preview-records";

export class PreviewStore implements OfflineStore {
  private records: LocalRecord[];
  private conflicts = structuredClone(initialConflicts);
  private readModels = new Map<
    string,
    {
      key: string;
      schemaVersion: number;
      payload: JsonObject;
      updatedAt: string;
    }
  >();

  constructor(records: LocalRecord[] = initialRecords) {
    this.records = structuredClone(records);
  }

  async initialize() {}
  async close() {}
  async clear() {
    this.records = [];
    this.readModels.clear();
  }

  async getRecord(entityType: string, recordId: string) {
    return (
      this.records.find(
        (item) => item.entityType === entityType && item.id === recordId,
      ) ?? null
    );
  }

  async listRecords(query: RecordQuery) {
    return this.records
      .filter(
        (item) =>
          item.entityType === query.entityType &&
          (query.includeDeleted || !item.deletedAt),
      )
      .slice(0, query.limit ?? 100);
  }

  async stageMutation(input: StageMutationInput): Promise<PendingMutation> {
    const index = this.records.findIndex(
      (item) =>
        item.entityType === input.entityType && item.id === input.recordId,
    );
    const current = index >= 0 ? this.records[index] : null;
    const next: LocalRecord = {
      id: input.recordId,
      entityType: input.entityType,
      scope: current?.scope ?? { kind: "USER", id: ownerId },
      revision: current?.revision ?? "0",
      schemaVersion: input.schemaVersion,
      updatedAt: new Date().toISOString(),
      deletedAt: input.operation === "DELETE" ? new Date().toISOString() : null,
      payload: input.payload,
      syncState: "PENDING",
    };
    if (index >= 0) this.records[index] = next;
    else this.records.unshift(next);
    return {
      sequence: Date.now(),
      idempotencyKey: crypto.randomUUID(),
      recordId: input.recordId,
      entityType: input.entityType,
      operation: input.operation,
      expectedRevision: input.expectedRevision,
      schemaVersion: input.schemaVersion,
      payload: input.payload,
      createdAt: next.updatedAt,
      attemptCount: 0,
      retryAfter: null,
      state: "QUEUED",
      batchId: null,
      errorCode: null,
    };
  }

  async claimPendingBatch() {
    return [];
  }
  async releasePendingBatch() {}
  async applyRemoteBatch(
    records: SyncRecord[],
    _nextCursor: string | null,
    activeHouseholdId: string | null,
  ) {
    this.records = this.records.filter((record) =>
      record.scope.kind === "USER" || record.scope.id === activeHouseholdId);
    for (const record of records) {
      const index = this.records.findIndex((item) =>
        item.entityType === record.entityType && item.id === record.id);
      const localRecord: LocalRecord = { ...record, syncState: "CLEAN" };
      if (index >= 0) this.records[index] = localRecord;
      else this.records.push(localRecord);
    }
  }
  async applyPushResults() {}
  async getCursor() {
    return null;
  }
  async listConflicts() {
    return this.conflicts;
  }
  async listFailures() {
    return [];
  }
  async resolveConflict(
    idempotencyKey: string,
    resolution: ConflictResolution,
  ) {
    const conflict = this.conflicts.find(
      (item) => item.idempotencyKey === idempotencyKey,
    );
    if (!conflict) throw new Error("Conflict not found.");
    const index = this.records.findIndex(
      (item) => item.id === conflict.recordId,
    );
    if (resolution === "USE_SERVER") {
      this.records[index] = { ...conflict.serverRecord, syncState: "CLEAN" };
    } else {
      this.records[index] = { ...this.records[index]!, syncState: "PENDING" };
    }
    this.conflicts = this.conflicts.filter(
      (item) => item.idempotencyKey !== idempotencyKey,
    );
  }
  async cacheFile() {}
  async getCachedFile() {
    return null;
  }
  async removeCachedFile() {}
  async getReadModel(key: string) {
    return this.readModels.get(key) ?? null;
  }
  async putReadModel(key: string, schemaVersion: number, payload: JsonObject) {
    this.readModels.set(key, {
      key,
      schemaVersion,
      payload,
      updatedAt: new Date().toISOString(),
    });
  }
  async removeReadModel(key: string) {
    this.readModels.delete(key);
  }
  async stageDocumentUpload() {}
  async listDocumentUploads() {
    return [];
  }
  async claimNextDocumentUpload() {
    return null;
  }
  async releaseDocumentUpload() {}
  async retryDocumentUpload() {}
  async completeDocumentUpload() {}
}
