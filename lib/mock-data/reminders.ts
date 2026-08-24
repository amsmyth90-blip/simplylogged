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
};

export const remindersList: Reminder[] = [];
