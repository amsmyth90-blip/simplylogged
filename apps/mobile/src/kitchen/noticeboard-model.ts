import {
  emptyNoticeDraft,
  resolveNoticeDate,
  type KitchenNotice,
  type KitchenNoticeDraft,
} from "@diarydock/kitchen";

export function draftForNotice(notice?: KitchenNotice): KitchenNoticeDraft {
  if (!notice) return { ...emptyNoticeDraft };
  return {
    title: notice.title,
    detail: notice.detail,
    category: notice.category,
    assignedTo: notice.assignedTo,
    due: notice.due,
    colour: notice.colour,
    pinned: notice.pinned,
    completed: notice.completed,
    archived: notice.archived,
    completedAt: notice.completedAt,
    archivedAt: notice.archivedAt,
    source: notice.source ?? "manual",
  };
}

export function noticeWhenOptions(current: string, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset + 1);
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  });
  const standard = ["", "Today", "Tonight", "Tomorrow", ...days,
    "This week", "This weekend", "Next week"];
  return Array.from(new Set(current && !standard.includes(current) ? [current, ...standard] : standard));
}

export function suggestedLinks(due: string) {
  return { linkCalendar: Boolean(resolveNoticeDate(due)), linkReminder: Boolean(due) };
}
