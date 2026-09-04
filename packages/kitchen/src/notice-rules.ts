import type {
  KitchenNotice,
  KitchenNoticeDraft,
  NoticeCalendarEvent,
  NoticeCategory,
  NoticeReminder,
} from "./notice-types.ts";

export const noticeCategories: Array<"All" | NoticeCategory> = [
  "All", "School", "Home", "Health", "Plans",
];

export const emptyNoticeDraft: KitchenNoticeDraft = {
  title: "",
  detail: "",
  category: "Home",
  assignedTo: "Family",
  due: "",
  colour: "sage",
  pinned: true,
  completed: false,
  archived: false,
  source: "manual",
};

export function resolveNoticeDate(label: string, base = new Date()) {
  if (!label) return null;
  const normalized = label.toLowerCase();
  const date = new Date(base);
  date.setHours(12, 0, 0, 0);
  if (normalized === "today" || normalized === "tonight") return date;
  if (normalized === "tomorrow") { date.setDate(date.getDate() + 1); return date; }
  if (normalized === "this week") { date.setDate(date.getDate() + 3); return date; }
  if (normalized === "this weekend") {
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7));
    return date;
  }
  if (normalized === "next week") { date.setDate(date.getDate() + 7); return date; }
  const dated = label.match(/^[A-Za-z]{3}\s+(\d{1,2})\s+([A-Za-z]{3})$/);
  if (dated) {
    const parsed = new Date(`${dated[1]} ${dated[2]} ${date.getFullYear()} 12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      if (parsed.getTime() < date.getTime() - 86_400_000) parsed.setFullYear(parsed.getFullYear() + 1);
      return parsed;
    }
  }
  const weekday = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    .findIndex((day) => normalized.startsWith(day));
  if (weekday < 0) return null;
  date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7 || 7));
  return date;
}

export function toNoticeDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

export function noticeReminderGroup(label: string, now = Date.now()): NoticeReminder["group"] {
  const normalized = label.toLowerCase();
  if (normalized === "today" || normalized === "tonight") return "today";
  const date = resolveNoticeDate(label, new Date(now));
  if (date && date.getTime() <= now + 7 * 86_400_000) return "week";
  return normalized.includes("week") ? "week" : "later";
}

function noticeTime(notice: Pick<KitchenNotice, "title" | "detail" | "due">) {
  const match = `${notice.due} ${notice.title} ${notice.detail}`
    .match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (!match) return "09:00";
  let hour = Number(match[1]);
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function calendarCategory(category: NoticeCategory): NoticeCalendarEvent["category"] {
  if (category === "School") return "school";
  if (category === "Health") return "appointments";
  return "family";
}

export function buildNoticeArtifacts(input: {
  draft: KitchenNoticeDraft;
  existing?: KitchenNotice;
  linkCalendar: boolean;
  linkReminder: boolean;
  noticeId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const title = input.draft.title.trim();
  const completedAt = input.draft.completed
    ? input.draft.completedAt ?? now.toISOString() : undefined;
  const linkedReminderId = input.linkReminder && input.draft.due
    ? input.existing?.linkedReminderId ?? `notice-reminder-${input.noticeId}` : undefined;
  const dueDate = resolveNoticeDate(input.draft.due, now);
  const linkedCalendarEventId = input.linkCalendar && dueDate
    ? input.existing?.linkedCalendarEventId ?? `notice-calendar-${input.noticeId}` : undefined;
  const notice: KitchenNotice = {
    ...input.draft,
    id: input.noticeId,
    title,
    detail: input.draft.detail.trim(),
    createdAt: input.existing?.createdAt ?? now.toISOString(),
    completedAt,
    linkedReminderId,
    linkedCalendarEventId,
  };
  const reminder: NoticeReminder | null = linkedReminderId ? {
    id: linkedReminderId,
    title,
    note: [notice.detail, `For ${notice.assignedTo}`].filter(Boolean).join(" - "),
    roomId: "kitchen",
    roomName: "Kitchen",
    group: notice.completed ? "done" : noticeReminderGroup(notice.due, now.getTime()),
    timeLabel: notice.completed ? "Completed" : notice.due,
    priority: notice.category === "Health" || notice.category === "School" ? "high" : "normal",
    assignedTo: notice.assignedTo,
    sourceNoticeId: notice.id,
  } : null;
  const calendarEvent: NoticeCalendarEvent | null = linkedCalendarEventId && dueDate ? {
    id: linkedCalendarEventId,
    title,
    date: toNoticeDateKey(dueDate),
    time: noticeTime(notice),
    category: calendarCategory(notice.category),
    assignedTo: notice.assignedTo,
    noticeId: notice.id,
  } : null;
  return { calendarEvent, notice, reminder };
}
