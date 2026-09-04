import { useCallback, useEffect, useMemo, useState } from "react";

import { DocumentService, type DocumentSummary, type EditableDocument } from "@diarydock/documents";
import type { ConflictResolution, OfflineStore, SyncConflict } from "@diarydock/offline-store";

export function useDocuments(store: OfflineStore, syncStatus: string, synchronize: () => Promise<unknown>) {
  const service = useMemo(() => new DocumentService(store), [store]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [nextDocuments, nextConflicts] = await Promise.all([service.list(), store.listConflicts()]);
      setDocuments(nextDocuments);
      setConflicts(nextConflicts.filter((item) => item.entityType === "document"));
      setError(null);
    } catch {
      setError("Your files could not be opened safely.");
    } finally {
      setLoading(false);
    }
  }, [service, store]);

  useEffect(() => {
    void reload();
  }, [reload, syncStatus]);

  const change = useCallback(async (work: () => Promise<unknown>) => {
    try {
      await work();
      await reload();
      void synchronize().then(reload);
      return true;
    } catch {
      setError("Those file details could not be saved safely.");
      return false;
    }
  }, [reload, synchronize]);

  const update = useCallback((existing: DocumentSummary, draft: EditableDocument) => (
    change(() => service.update(existing, draft))
  ), [change, service]);

  const resolveConflict = useCallback((conflict: SyncConflict, resolution: ConflictResolution) => (
    change(() => store.resolveConflict(conflict.idempotencyKey, resolution))
  ), [change, store]);

  return { conflicts, documents, error, loading, resolveConflict, update };
}
