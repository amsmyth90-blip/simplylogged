import type { OfflineStore } from "@diarydock/offline-store";

import {
  documentPayload,
  parseDocument,
  type DocumentSummary,
  type EditableDocument,
} from "./document.ts";

export class DocumentService {
  private readonly store: OfflineStore;

  constructor(store: OfflineStore) {
    this.store = store;
  }

  async list() {
    const records = await this.store.listRecords({ entityType: "document", limit: 500 });
    const documents: DocumentSummary[] = [];
    for (const record of records) {
      try {
        documents.push(parseDocument(record));
      } catch {
        continue;
      }
    }
    return documents;
  }

  async update(existing: DocumentSummary, draft: EditableDocument) {
    return this.store.stageMutation({
      recordId: existing.syncId,
      entityType: "document",
      operation: "UPSERT",
      expectedRevision: existing.revision,
      schemaVersion: 1,
      payload: documentPayload(existing, draft),
    });
  }
}
