import type { OfflineStore } from "@diarydock/offline-store";

import {
  parseReminder,
  reminderPayload,
  systemReminderCompletionPayload,
  type EditableReminder,
  type Reminder,
} from "./reminder.ts";

export class ReminderService {
  private readonly store: OfflineStore;

  constructor(store: OfflineStore) {
    this.store = store;
  }

  async list() {
    const records = await this.store.listRecords({ entityType: "reminder", limit: 500 });
    const reminders: Reminder[] = [];
    for (const record of records) {
      try {
        reminders.push(parseReminder(record));
      } catch {
        continue;
      }
    }
    return reminders;
  }

  async create(reminder: EditableReminder) {
    return this.createWithId(crypto.randomUUID(), reminder);
  }

  async createWithId(recordId: string, reminder: EditableReminder) {
    return this.store.stageMutation({
      recordId,
      entityType: "reminder",
      operation: "UPSERT",
      expectedRevision: null,
      schemaVersion: 1,
      payload: reminderPayload(reminder),
    });
  }

  async update(existing: Reminder, reminder: EditableReminder) {
    if (existing.origin === "SYSTEM_GENERATED") {
      throw new Error("System reminders are managed by DiaryDock.");
    }
    return this.store.stageMutation({
      recordId: existing.id,
      entityType: "reminder",
      operation: "UPSERT",
      expectedRevision: existing.revision === "0" ? null : existing.revision,
      schemaVersion: 1,
      payload: reminderPayload(reminder),
    });
  }

  async setCompletion(existing: Reminder, completed: boolean) {
    if (existing.origin !== "SYSTEM_GENERATED") {
      const next = { ...existing, group: completed ? "done" as const : "today" as const };
      next.timeLabel = completed ? "Completed" : "Today";
      return this.update(existing, next);
    }
    return this.store.stageMutation({
      recordId: existing.id,
      entityType: "reminder",
      operation: "UPSERT",
      expectedRevision: existing.revision,
      schemaVersion: 1,
      payload: systemReminderCompletionPayload(existing, completed),
    });
  }

  async remove(existing: Reminder) {
    if (existing.origin === "SYSTEM_GENERATED") {
      throw new Error("System reminders are managed by DiaryDock.");
    }
    return this.store.stageMutation({
      recordId: existing.id,
      entityType: "reminder",
      operation: "DELETE",
      expectedRevision: existing.revision === "0" ? null : existing.revision,
      schemaVersion: 1,
      payload: {},
    });
  }
}
