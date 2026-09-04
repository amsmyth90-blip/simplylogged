export const KITCHEN_NOTICEBOARD_SCHEMA_VERSION = 1;

export type NoticeCategory = "School" | "Home" | "Health" | "Plans";
export type NoticeColour = "cream" | "sage" | "blue" | "clay";
export type NoticeSource = "manual" | "photo" | "voice";

export type KitchenNotice = {
  id: string;
  title: string;
  detail: string;
  category: NoticeCategory;
  assignedTo: string;
  due: string;
  colour: NoticeColour;
  pinned: boolean;
  completed: boolean;
  archived: boolean;
  createdAt: string;
  completedAt?: string;
  archivedAt?: string;
  source?: NoticeSource;
  linkedReminderId?: string;
  linkedCalendarEventId?: string;
};

export type KitchenNoticeDraft = Omit<KitchenNotice, "id" | "createdAt">;

export type NoticeReminder = {
  id: string;
  title: string;
  note: string;
  roomId: "kitchen";
  roomName: "Kitchen";
  group: "today" | "week" | "later" | "done";
  timeLabel: string;
  priority: "high" | "normal";
  assignedTo: string;
  sourceNoticeId: string;
};

export type NoticeCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: "appointments" | "school" | "family";
  assignedTo: string;
  noticeId: string;
};

export type KitchenNoticeboardSnapshot = {
  schemaVersion: typeof KITCHEN_NOTICEBOARD_SCHEMA_VERSION;
  revision: string | null;
  notices: KitchenNotice[];
  assignees: string[];
};

export type KitchenNoticeMutation =
  | {
    operation: "SAVE_NOTICE";
    revision: string | null;
    noticeId: string | null;
    title: string;
    detail: string;
    category: NoticeCategory;
    assignedTo: string;
    due: string;
    colour: NoticeColour;
    pinned: boolean;
    completed: boolean;
    source: NoticeSource;
    linkReminder: boolean;
    linkCalendar: boolean;
  }
  | {
    operation: "SET_NOTICE_STATE";
    revision: string | null;
    noticeId: string;
    state: "PINNED" | "UNPINNED" | "COMPLETED" | "OPEN" | "ARCHIVED" | "RESTORED";
  };
