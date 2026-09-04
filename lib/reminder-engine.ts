export const systemReminderOffsets = [90, 60, 30, 14, 7, 1] as const;

export function offsetsForReminderType(reminderType: string) {
  if (reminderType === "vaccination_due") return [30, 14, 7, 1] as const;
  if (reminderType === "warranty_expiry") return [60, 30, 14, 7, 1] as const;
  return systemReminderOffsets;
}

export type SystemReminderOccurrence = {
  dedupeKey: string;
  offsetDays: number;
  sourceDueAt: string;
  remindAt: string;
};

export function buildSystemReminderSchedule(input: {
  userId: string;
  sourceResourceType: string;
  sourceResourceId: string;
  sourceDateKey: string;
  dueAt: string;
  offsets?: readonly number[];
}) {
  const dueTime = Date.parse(input.dueAt);
  if (!Number.isFinite(dueTime)) throw new Error("A valid source due date is required.");
  const offsets = Array.from(new Set(input.offsets ?? systemReminderOffsets))
    .filter((offset) => Number.isInteger(offset) && offset >= 0 && offset <= 365)
    .sort((a, b) => b - a);

  return offsets.map<SystemReminderOccurrence>((offsetDays) => ({
    dedupeKey: [input.userId, input.sourceResourceType, input.sourceResourceId, input.sourceDateKey, offsetDays].join(":"),
    offsetDays,
    sourceDueAt: new Date(dueTime).toISOString(),
    remindAt: new Date(dueTime - offsetDays * 86_400_000).toISOString()
  }));
}
