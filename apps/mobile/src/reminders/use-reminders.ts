import { useCallback, useEffect, useMemo, useState } from "react";

import { ReminderService, type EditableReminder, type Reminder } from "@diarydock/reminders";
import type {
  ConflictResolution,
  OfflineStore,
  SyncConflict,
} from "@diarydock/offline-store";

export function useReminders(store: OfflineStore, syncStatus: string, synchronize: () => Promise<unknown>) {
  const service = useMemo(() => new ReminderService(store), [store]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [nextReminders, nextConflicts] = await Promise.all([
        service.list(),
        store.listConflicts(),
      ]);
      setReminders(nextReminders);
      setConflicts(nextConflicts);
      setError(null);
    } catch {
      setError("Reminders could not be opened safely.");
    }
  }, [service, store]);

  useEffect(() => {
    void reload();
  }, [reload, syncStatus]);

  const afterChange = useCallback(async () => {
    await reload();
    void synchronize().then(reload);
  }, [reload, synchronize]);

  const change = useCallback(async (work: () => Promise<unknown>) => {
    try {
      setError(null);
      await work();
      await afterChange();
      return true;
    } catch {
      setError("That reminder could not be saved safely.");
      return false;
    }
  }, [afterChange]);

  const create = useCallback(async (reminder: EditableReminder) => {
    return change(() => service.create(reminder));
  }, [change, service]);

  const createWithId = useCallback(async (
    recordId: string,
    reminder: EditableReminder,
  ) => change(() => service.createWithId(recordId, reminder)), [change, service]);

  const update = useCallback(async (existing: Reminder, reminder: EditableReminder) => {
    return change(() => service.update(existing, reminder));
  }, [change, service]);

  const toggle = useCallback(async (reminder: Reminder) => {
    await change(() => service.setCompletion(reminder, reminder.group !== "done"));
  }, [change, service]);

  const remove = useCallback(async (reminder: Reminder) => {
    await change(() => service.remove(reminder));
  }, [change, service]);

  const resolveConflict = useCallback(async (
    conflict: SyncConflict,
    resolution: ConflictResolution,
  ) => {
    return change(() => store.resolveConflict(conflict.idempotencyKey, resolution));
  }, [change, store]);

  return { conflicts, create, createWithId, error, reminders, remove, resolveConflict, toggle, update };
}
