import type { IconName } from "@/components/UiIcon";
import type { DiaryDockAppState } from "@/lib/diarydock-data";

export type HouseholdStyle = "children" | "adults" | "shared" | "solo";

export type FamilyInboxItem = {
  actionable: boolean;
  assignedTo?: string;
  detail: string;
  dueDate?: string;
  href: string;
  icon: IconName;
  id: string;
  linkedReminderId?: string;
  priority: number;
  sourceId: string;
  sourceType: "mail" | "reminder" | "document";
  status: string;
  statusTone: string;
  title: string;
};

export type HouseholdStyleOption = {
  description: string;
  features: Array<{ label: string; detail: string; href: string; icon: IconName }>;
  id: HouseholdStyle;
  label: string;
  scheduleLabel: string;
  shortLabel: string;
};

export const familyWeekDayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

export const householdStyleOptions: HouseholdStyleOption[] = [
  {
    id: "children",
    label: "Family with children",
    shortLabel: "With children",
    description:
      "Keep every adult and child's work, school, clubs, appointments and pick-ups together.",
    scheduleLabel: "Family schedules",
    features: [
      { label: "Weekly timetable", detail: "Everyone's repeating routines in one view", href: "/family/schedules", icon: "briefcase" },
      { label: "Pick-ups & transport", detail: "Who is taking them and how", href: "/family/schedules", icon: "clock" },
      { label: "Family reminders", detail: "Forms, kit and things to remember", href: "/reminders", icon: "check" }
    ]
  },
  {
    id: "adults",
    label: "Adults only",
    shortLabel: "Adults only",
    description: "Bring work patterns, appointments, plans and shared jobs into one view.",
    scheduleLabel: "Adult schedules",
    features: [
      { label: "Weekly schedules", detail: "Appointments, exercise and repeating plans", href: "/family/schedules", icon: "calendar" },
      { label: "Work patterns", detail: "Shifts, travel and working days", href: "/family/schedules", icon: "briefcase" },
      { label: "Shared jobs", detail: "Household reminders and errands", href: "/reminders", icon: "check" }
    ]
  },
  {
    id: "shared",
    label: "Shared home",
    shortLabel: "Shared home",
    description: "Coordinate housemates without treating the household like a family with children.",
    scheduleLabel: "Home rota",
    features: [
      { label: "House rota", detail: "Bins, cleaning and repeating jobs", href: "/family/schedules", icon: "check" },
      { label: "Shared responsibilities", detail: "Who is handling each household job", href: "/reminders", icon: "check" },
      { label: "House schedules", detail: "Everyone's weekly pattern", href: "/family/schedules", icon: "home" }
    ]
  },
  {
    id: "solo",
    label: "Just me",
    shortLabel: "Just me",
    description: "A calm personal schedule with trusted people available when you need them.",
    scheduleLabel: "My schedule",
    features: [
      { label: "My week", detail: "Appointments and repeating personal plans", href: "/family/schedules", icon: "calendar" },
      { label: "Life reminders", detail: "Jobs, renewals and errands", href: "/reminders", icon: "check" },
      { label: "Trusted people", detail: "Keep close contacts easy to reach", href: "/family", icon: "users" }
    ]
  }
];

const inboxStopWords = new Set(["and", "for", "form", "review", "sign", "the"]);

function inboxTitleTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !inboxStopWords.has(token))
  );
}

function inboxTitlesOverlap(first: string, second: string) {
  const firstTokens = inboxTitleTokens(first);
  const secondTokens = inboxTitleTokens(second);
  let matches = 0;
  firstTokens.forEach((token) => {
    if (secondTokens.has(token)) matches += 1;
  });
  return matches >= 2;
}

function inboxDueStatus(value?: string) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T12:00:00`);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const label = due.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (dueDay.getTime() < today.getTime()) {
    return { label: `Overdue · ${label}`, priority: 0, tone: "bg-[#f7dfd8] text-[#8d4f43]" };
  }
  if (dueDay.getTime() === today.getTime()) {
    return { label: "Due today", priority: 0, tone: "bg-[#f7dfd8] text-[#8d4f43]" };
  }
  return { label: `Due ${label}`, priority: 1, tone: "bg-[#f5ead2] text-[#7d6438]" };
}

export function buildFamilyInboxItems(
  state: Pick<DiaryDockAppState, "mailboxItems" | "reminders" | "vaultDocuments">
) {
  const activeReminders = state.reminders.filter(
    (reminder) =>
      reminder.group !== "done" &&
      (["family-room", "mailbox"].includes(reminder.roomId ?? "") ||
        reminder.roomName === "Family Room" ||
        reminder.roomName === "Mailbox")
  );
  const matchedReminderIds = new Set<string>();
  const mailboxItems = state.mailboxItems
    .filter(
      (item) =>
        !item.familyCompletedAt &&
        item.routeStatus !== "ignored" &&
        (item.suggestedRoom?.toLowerCase() === "family room" || item.kind === "Form")
    )
    .map<FamilyInboxItem>((item) => {
      const reminder = activeReminders.find((entry) => inboxTitlesOverlap(item.title, entry.title));
      if (reminder) matchedReminderIds.add(reminder.id);
      const dueStatus = inboxDueStatus(item.dueDate ?? reminder?.dueDate);
      return {
        id: `mail-${item.id}`,
        sourceId: item.id,
        sourceType: "mail",
        title: item.title,
        detail: `${item.source} · ${reminder?.timeLabel ?? "Needs sorting"}`,
        status: dueStatus?.label ?? (item.routeStatus === "new" ? (reminder?.priority === "high" ? "Needs attention" : "Needs sorting") : item.routeStatus === "reminder" ? "Reminder set" : "Filed"),
        statusTone: dueStatus?.tone ?? (reminder?.priority === "high" ? "bg-[#f7dfd8] text-[#8d4f43]" : "bg-[#f5ead2] text-[#7d6438]"),
        icon: item.kind === "Form" ? "check" : "mail",
        href: item.routeStatus === "reminder" ? "/reminders" : "/intake",
        priority: dueStatus?.priority ?? (reminder?.priority === "high" ? 0 : 1),
        actionable: true,
        assignedTo: item.assignedTo ?? reminder?.assignedTo,
        dueDate: item.dueDate ?? reminder?.dueDate,
        linkedReminderId: reminder?.id
      };
    });
  const reminderItems = activeReminders
    .filter((reminder) => !matchedReminderIds.has(reminder.id))
    .map<FamilyInboxItem>((reminder) => {
      const dueStatus = inboxDueStatus(reminder.dueDate);
      return {
        id: `reminder-${reminder.id}`,
        sourceId: reminder.id,
        sourceType: "reminder",
        title: reminder.title,
        detail: reminder.note ?? reminder.roomName ?? "Shared family reminder",
        status: dueStatus?.label ?? reminder.timeLabel,
        statusTone: dueStatus?.tone ?? (reminder.priority === "high" ? "bg-[#f7dfd8] text-[#8d4f43]" : "bg-[#e7eddc] text-[#5e714f]"),
        icon: "calendar",
        href: "/reminders",
        priority: dueStatus?.priority ?? (reminder.priority === "high" ? 0 : 2),
        actionable: true,
        assignedTo: reminder.assignedTo,
        dueDate: reminder.dueDate
      };
    });
  const documents = state.vaultDocuments
    .filter((document) => document.visibility === "HOUSEHOLD")
    .map<FamilyInboxItem>((document) => ({
      id: `document-${document.id}`,
      sourceId: document.id,
      sourceType: "document",
      title: document.title,
      detail: `${document.category} · Shared with your household`,
      status: "Secure shortcut",
      statusTone: "bg-[#dfe8ee] text-[#506b7a]",
      icon: "folder",
      href: `/document/${document.id}`,
      priority: 3,
      actionable: false
    }));
  return [...mailboxItems, ...reminderItems, ...documents]
    .sort((first, second) => first.priority - second.priority)
    .slice(0, 6);
}
