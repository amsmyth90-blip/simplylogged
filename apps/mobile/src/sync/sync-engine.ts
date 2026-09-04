import {
  SYNC_API_VERSION,
  type SyncMutation,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
} from "@diarydock/contracts";
import type { OfflineStore, PendingMutation } from "@diarydock/offline-store";

import { syncRetryDelaySeconds } from "./retry-policy.ts";

type SyncTransport = {
  pull(accessToken: string, cursor: string | null): Promise<SyncPullResponse>;
  push(accessToken: string, request: SyncPushRequest): Promise<SyncPushResponse>;
};

export type SyncSummary = {
  pulled: number;
  pushed: number;
  conflicts: number;
};

function toMutation(pending: PendingMutation): SyncMutation {
  return {
    idempotencyKey: pending.idempotencyKey,
    recordId: pending.recordId,
    entityType: pending.entityType,
    operation: pending.operation,
    expectedRevision: pending.expectedRevision,
    schemaVersion: pending.schemaVersion,
    payload: pending.payload,
  };
}

function retryTime(error: unknown, pending: PendingMutation[]) {
  const attempts = Math.max(1, ...pending.map((mutation) => mutation.attemptCount));
  return new Date(Date.now() + syncRetryDelaySeconds(error, attempts) * 1_000).toISOString();
}

export class SyncEngine {
  private active: Promise<SyncSummary> | null = null;
  private readonly store: OfflineStore;
  private readonly transport: SyncTransport;
  private readonly deviceId: () => Promise<string>;

  constructor(store: OfflineStore, transport: SyncTransport, deviceId: () => Promise<string>) {
    this.store = store;
    this.transport = transport;
    this.deviceId = deviceId;
  }

  synchronize(accessToken: string) {
    this.active ??= this.run(accessToken).finally(() => {
      this.active = null;
    });
    return this.active;
  }

  private async run(accessToken: string): Promise<SyncSummary> {
    const summary: SyncSummary = { pulled: 0, pushed: 0, conflicts: 0 };
    await this.pullPages(accessToken, summary);
    const deviceId = await this.deviceId();

    for (let batchNumber = 0; batchNumber < 10; batchNumber += 1) {
      const batchId = crypto.randomUUID();
      const pending = await this.store.claimPendingBatch(batchId, 100);
      if (!pending.length) break;
      try {
        const response = await this.transport.push(accessToken, {
          apiVersion: SYNC_API_VERSION,
          deviceId,
          batchId,
          mutations: pending.map(toMutation),
        });
        if (response.batchId !== batchId) throw new Error("The sync batch response does not match.");
        await this.store.applyPushResults(batchId, response.results);
        summary.pushed += response.results.filter((result) => result.status === "APPLIED").length;
        summary.conflicts += response.results.filter((result) => result.status === "CONFLICT").length;
      } catch (error) {
        await this.store.releasePendingBatch(batchId, retryTime(error, pending));
        throw error;
      }
    }

    await this.pullPages(accessToken, summary);
    return summary;
  }

  private async pullPages(accessToken: string, summary: SyncSummary) {
    let cursor = await this.store.getCursor();
    for (let page = 0; page < 20; page += 1) {
      const response = await this.transport.pull(accessToken, cursor);
      await this.store.applyRemoteBatch(
        response.records,
        response.nextCursor,
        response.activeHouseholdId,
      );
      summary.pulled += response.records.length;
      cursor = response.nextCursor;
      if (!response.hasMore) return;
    }
  }
}
