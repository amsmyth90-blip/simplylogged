import {
  evaluateGuardianSources,
  type GuardianFinding,
  type GuardianSource,
} from "@diarydock/guardian";
import type { OfflineStore } from "@diarydock/offline-store";
import { ReminderService } from "@diarydock/reminders";

export async function loadLocalGuardian(store: OfflineStore): Promise<GuardianFinding[]> {
  const reminders = await new ReminderService(store).list();
  const sources = reminders.flatMap((reminder): GuardianSource[] => {
    if (reminder.origin !== "SYSTEM_GENERATED" || !reminder.sourceResourceType
      || !reminder.sourceResourceId || !reminder.sourceDateKey
      || !(reminder.sourceDueAt ?? reminder.dueAt)) return [];
    return [{
      resourceType: reminder.sourceResourceType,
      resourceId: reminder.sourceResourceId,
      dateKey: reminder.sourceDateKey,
      reminderType: reminder.reminderType,
      title: reminder.title,
      dueAt: reminder.sourceDueAt ?? reminder.dueAt!,
      timeZone: reminder.timeZone,
    }];
  });
  return evaluateGuardianSources(sources).map((candidate) => ({
    id: `local:${candidate.dedupeKey}`,
    type: candidate.type,
    severity: candidate.severity,
    resourceType: candidate.resourceType,
    resourceId: candidate.resourceId,
    title: candidate.title,
    description: candidate.description,
    dueAt: candidate.dueAt,
  }));
}
