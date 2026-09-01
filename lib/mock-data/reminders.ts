export type ReminderGroup = "today" | "week" | "later" | "done";

export type Reminder = {
  id: string;
  title: string;
  note?: string;
  roomId?: string;
  roomName?: string;
  group: ReminderGroup;
  timeLabel: string;
  priority: "high" | "normal" | "low";
  repeat?: string;
  documentId?: string;
  documentTitle?: string;
  assignedTo?: string;
  dueDate?: string;
  sourceNoticeId?: string;
  dueAt?: string;
  sourceDueAt?: string;
  origin?: "USER_CREATED" | "SYSTEM_GENERATED";
  reminderType?: string;
  sourceResourceType?: string;
  sourceResourceId?: string;
  sourceDateKey?: string;
  ruleId?: string;
  ruleVersion?: number;
  dedupeKey?: string;
  scheduleOffsetDays?: number;
  timeZone?: string;
};

export const remindersList: Reminder[] = [];
