import {
  type OfflineStore,
  type PendingDocumentUpload,
  tryCacheFile,
} from "@diarydock/offline-store";

import { syncRetryDelaySeconds } from "@mobile/sync/retry-policy";

import { HttpDocumentUploadClient } from "./upload-client";
import { UploadTransportError } from "./upload-transport-error";

function retryAt(error: unknown, item: PendingDocumentUpload) {
  const seconds = error instanceof UploadTransportError && error.retryAfterSeconds
    ? error.retryAfterSeconds
    : syncRetryDelaySeconds(error, item.attemptCount);
  return new Date(Date.now() + seconds * 1_000).toISOString();
}

function errorCode(error: unknown) {
  if (error instanceof UploadTransportError) return error.status ? `HTTP_${error.status}` : "NETWORK_ERROR";
  return "UPLOAD_ERROR";
}

export class DocumentUploadEngine {
  private active: Promise<number> | null = null;
  private readonly store: OfflineStore;
  private readonly client: HttpDocumentUploadClient;

  constructor(
    store: OfflineStore,
    client = new HttpDocumentUploadClient(),
  ) {
    this.store = store;
    this.client = client;
  }

  flush(accessToken: string) {
    this.active ??= this.run(accessToken).finally(() => {
      this.active = null;
    });
    return this.active;
  }

  private async run(accessToken: string) {
    let completed = 0;
    for (let index = 0; index < 8; index += 1) {
      const item = await this.store.claimNextDocumentUpload();
      if (!item) break;
      try {
        const result = await this.client.upload(item, accessToken);
        await this.store.completeDocumentUpload(item.jobId);
        completed += 1;
        await tryCacheFile(this.store, {
          documentId: result.documentId,
          version: result.fileVersion,
          mimeType: item.mimeType,
          bytes: item.bytes,
          sha256: item.sha256,
        });
      } catch (error) {
        const permanent = error instanceof UploadTransportError && error.permanent;
        await this.store.releaseDocumentUpload({
          jobId: item.jobId,
          errorCode: errorCode(error),
          retryAfter: permanent ? null : retryAt(error, item),
          permanent,
        });
        if (!permanent) throw error;
      }
    }
    return completed;
  }
}
