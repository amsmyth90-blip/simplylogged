import { roomDetails, type Reminder, type ReminderGroup } from "@/lib/mock-data";

export type ReminderDraft = {
  title: string;
  note: string;
  roomId: string;
  group: ReminderGroup;
  timeLabel: string;
  priority: Reminder["priority"];
  repeat: string;
  assignedTo: string;
};

export const defaultReminderDraft: ReminderDraft = {
  title: "",
  note: "",
  roomId: "",
  group: "today",
  timeLabel: "",
  priority: "normal",
  repeat: "",
  assignedTo: ""
};

export const reminderRoomOptions = Object.values(roomDetails)
  .map((room) => ({ id: room.id, name: room.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function buildReminderDraft(reminder?: Reminder): ReminderDraft {
  if (!reminder) return defaultReminderDraft;
  return {
    title: reminder.title,
    note: reminder.note ?? "",
    roomId: reminder.roomId ?? "",
    group: reminder.group,
    timeLabel: reminder.timeLabel,
    priority: reminder.priority,
    repeat: reminder.repeat ?? "",
    assignedTo: reminder.assignedTo ?? ""
  };
}

export function snoozeReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    group: "week",
    timeLabel: "In 7 days",
    priority: reminder.priority === "high" ? "normal" : reminder.priority
  };
}
