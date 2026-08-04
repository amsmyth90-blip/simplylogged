"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { createHouseholdInvite } from "@/lib/household-sharing";
import type { HouseholdMember, Invite } from "@/lib/lifedock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

type InviteDraft = {
  email: string;
  name: string;
  relation: string;
  access: string;
};

type HouseholdStyle = "children" | "adults" | "shared" | "solo";

type FamilyInboxItem = {
  id: string;
  sourceId: string;
  sourceType: "mail" | "reminder" | "document";
  title: string;
  detail: string;
  status: string;
  statusTone: string;
  icon: IconName;
  href: string;
  priority: number;
  actionable: boolean;
  assignedTo?: string;
  dueDate?: string;
  linkedReminderId?: string;
};

type HotspotProps = {
  label: string;
  icon: IconName;
  position: { left: string; top: string };
  onClick?: () => void;
  href?: string;
  labelSide?: "left" | "right" | "below";
  badge?: number;
};

const defaultDraft: InviteDraft = {
  email: "",
  name: "",
  relation: "",
  access: "Family viewer - Family Room, Garden, reminders"
};

const inviteAccessOptions = [
  "Family viewer - Family Room, Garden, reminders",
  "Viewer - Memories only",
  "Emergency fallback - Safe Room essentials only",
  "Partner - Full household access"
];

const familyPosition = { left: "35%", top: "35.5%" };
const weekDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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

const householdStyles: Array<{
  id: HouseholdStyle;
  label: string;
  shortLabel: string;
  description: string;
  scheduleLabel: string;
  features: Array<{ label: string; detail: string; href: string; icon: IconName }>;
}> = [
  {
    id: "children",
    label: "Family with children",
    shortLabel: "With children",
    description: "Keep every adult and child's work, school, clubs, appointments and pick-ups together.",
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

function RoomHotspot({
  label,
  icon,
  position,
  onClick,
  href,
  labelSide = "right",
  badge
}: HotspotProps) {
  const content = (
    <>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/75 text-[#52664a] shadow-[0_10px_24px_rgba(51,46,36,0.24)] backdrop-blur-xl">
        <span className="absolute inset-[-7px] animate-ping rounded-full border border-white/55 opacity-35" />
        <UiIcon name={icon} className="relative h-[17px] w-[17px]" />
        {badge ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#aa5548] px-1 text-[9px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span
        className={`whitespace-nowrap rounded-full border border-white/85 bg-[#f8f4ec]/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.01em] text-[#273126] shadow-[0_10px_24px_rgba(51,46,36,0.2)] backdrop-blur-xl ${
          labelSide === "left"
            ? "absolute right-8"
            : labelSide === "below"
              ? "absolute top-9"
              : "absolute left-8"
        }`}
      >
        {label}
      </span>
    </>
  );

  const className =
    "absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
  const style = position;

  return href ? (
    <Link href={href} aria-label={label} className={className} style={style}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={className} style={style}>
      {content}
    </button>
  );
}

export function FamilyWorkspace() {
  const { state, household, hydrated, canManageHousehold, repositoryMode, updateState } = useLifeDockData();
  const members = state.householdMembers;
  const invites = state.familyInvites;
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [householdStyle, setHouseholdStyle] = useState<HouseholdStyle>("children");
  const [householdStyleSet, setHouseholdStyleSet] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.classList.add("family-immersive");

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.classList.remove("family-immersive");
    };
  }, []);

  useEffect(() => {
    const storedStyle = window.localStorage.getItem("lifedock-household-style");
    if (householdStyles.some((style) => style.id === storedStyle)) {
      setHouseholdStyle(storedStyle as HouseholdStyle);
      setHouseholdStyleSet(true);
    }
    if (new URLSearchParams(window.location.search).get("setup") === "schedules") {
      setScheduleOpen(true);
    }
  }, []);

  const selectHouseholdStyle = (style: HouseholdStyle) => {
    setHouseholdStyle(style);
    setHouseholdStyleSet(true);
    window.localStorage.setItem("lifedock-household-style", style);
  };

  const activeHouseholdStyle =
    householdStyles.find((style) => style.id === householdStyle) ?? householdStyles[0];
  const familyInboxItems = useMemo<FamilyInboxItem[]>(() => {
    const activeReminders = state.reminders.filter(
      (reminder) =>
        reminder.group !== "done" &&
        (reminder.roomId === "family-room" ||
          reminder.roomId === "mailbox" ||
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
          status: dueStatus?.label ??
            (item.routeStatus === "new"
              ? reminder?.priority === "high"
                ? "Needs attention"
                : "Needs sorting"
              : item.routeStatus === "reminder"
                ? "Reminder set"
                : "Filed"),
          statusTone: dueStatus?.tone ??
            (reminder?.priority === "high"
              ? "bg-[#f7dfd8] text-[#8d4f43]"
              : "bg-[#f5ead2] text-[#7d6438]"),
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
          statusTone: dueStatus?.tone ??
            (reminder.priority === "high"
              ? "bg-[#f7dfd8] text-[#8d4f43]"
              : "bg-[#e7eddc] text-[#5e714f]"),
          icon: "calendar",
          href: "/reminders",
          priority: dueStatus?.priority ?? (reminder.priority === "high" ? 0 : 2),
          actionable: true,
          assignedTo: reminder.assignedTo,
          dueDate: reminder.dueDate
        };
      });
    const sharedDocuments = state.vaultDocuments
      .filter(
        (document) =>
          document.roomId === "family-room" ||
          document.sharedWith?.some((person) => person.toLowerCase() === "everyone")
      )
      .map<FamilyInboxItem>((document) => ({
        id: `document-${document.id}`,
        sourceId: document.id,
        sourceType: "document",
        title: document.title,
        detail: `${document.category} · Shared with everyone`,
        status: "Secure shortcut",
        statusTone: "bg-[#dfe8ee] text-[#506b7a]",
        icon: "folder",
        href: `/document/${document.id}`,
        priority: 3,
        actionable: false
      }));

    return [...mailboxItems, ...reminderItems, ...sharedDocuments]
      .sort((first, second) => first.priority - second.priority)
      .slice(0, 6);
  }, [state.mailboxItems, state.reminders, state.vaultDocuments]);
  const familyAssignees = useMemo(
    () =>
      Array.from(
        new Set([
          ...members.map((member) => member.name),
          ...state.householdProfiles
            .filter((profile) => profile.showInReminders)
            .map((profile) => profile.name)
        ].filter(Boolean))
      ),
    [members, state.householdProfiles]
  );
  const activeKidRoutines = state.kidSchedules.filter((routine) => !routine.paused).slice(0, 3);

  const closeInvite = () => {
    setInviteOpen(false);
    setDraft(defaultDraft);
    setMessage("");
  };

  const updateInboxItem = (
    item: FamilyInboxItem,
    field: "assignedTo" | "dueDate" | "complete",
    value = ""
  ) => {
    if (!item.actionable || item.sourceType === "document") return;

    const updateReminder = (reminder: (typeof state.reminders)[number]) => {
      if (field === "assignedTo") {
        return { ...reminder, assignedTo: value || undefined };
      }
      if (field === "dueDate") {
        return { ...reminder, dueDate: value || undefined };
      }
      return { ...reminder, group: "done" as const, timeLabel: "Completed" };
    };
    const reminderId = item.sourceType === "reminder" ? item.sourceId : item.linkedReminderId;
    const reminder = reminderId ? state.reminders.find((entry) => entry.id === reminderId) : undefined;
    const nextReminder = reminder ? updateReminder(reminder) : undefined;

    updateState((current) => ({
      ...current,
      mailboxItems:
        item.sourceType === "mail"
          ? current.mailboxItems.map((entry) =>
              entry.id === item.sourceId
                ? field === "assignedTo"
                  ? { ...entry, assignedTo: value || undefined }
                  : field === "dueDate"
                    ? { ...entry, dueDate: value || undefined }
                    : { ...entry, familyCompletedAt: new Date().toISOString() }
                : entry
            )
          : current.mailboxItems,
      reminders: nextReminder
        ? current.reminders.map((entry) => (entry.id === nextReminder.id ? nextReminder : entry))
        : current.reminders
    }));

    if (nextReminder && repositoryMode === "supabase") {
      void upsertStructuredReminder(nextReminder).catch(() => undefined);
    }
  };

  const sendInvite = async () => {
    const email = draft.email.trim().toLowerCase();
    const name = draft.name.trim();
    const relation = draft.relation.trim();

    if (!email || !name || !relation || !email.includes("@")) {
      setMessage("Add their name, relationship and a valid email address.");
      return;
    }

    setInviteBusy(true);
    setMessage("");

    try {
      const token = await createHouseholdInvite({
        email,
        name,
        relation,
        access: draft.access
      });
      const initials =
        name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("") || "N";
      const invite: Invite = {
        id: token,
        email,
        name,
        relation,
        access: draft.access,
        sentAgo: "Just now",
        initials,
        status: "pending"
      };

      updateState((current) => ({
        ...current,
        familyInvites: [...current.familyInvites, invite]
      }));
      closeInvite();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be created.");
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <>
      <main className="fixed inset-0 overflow-hidden bg-[#bda888]">
        <Image
          src="/images/family-fireside-clean.png"
          alt=""
          fill
          priority
          aria-hidden="true"
          className="scale-110 object-cover opacity-45 blur-2xl"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#4b3926]/15" />

        <section
          aria-label="Interactive family room"
          className="relative mx-auto h-full w-full max-w-[34rem] overflow-hidden bg-[#d5c3a7] shadow-[0_0_70px_rgba(38,28,19,0.35)]"
        >
          <Image
            src="/images/family-fireside-clean.png"
            alt="A warm fireside family room with a family portrait, invitation envelope and household shelves"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 544px) 100vw, 544px"
          />
          <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#382b20]/45 via-[#382b20]/8 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#2f251c]/40 via-[#2f251c]/8 to-transparent" />

          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/65 bg-white/65 text-[#273126] shadow-[0_12px_30px_rgba(42,33,24,0.18)] backdrop-blur-xl"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>

          <div className="absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-30 -translate-x-1/2 rounded-full border border-white/70 bg-white/70 px-5 py-2 text-center shadow-[0_12px_30px_rgba(42,33,24,0.16)] backdrop-blur-xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6c795f]">
              {household?.householdName ?? "DiaryDock"}
            </p>
            <h1 className="text-sm font-semibold tracking-tight text-[#1f281e]">Family Room</h1>
          </div>

          <RoomHotspot
            label={hydrated && members.length ? `Family · ${members.length}` : "Family"}
            icon="users"
            position={familyPosition}
            onClick={() => members[0] && setSelectedMember(members[0])}
            labelSide="right"
          />

          <RoomHotspot
            label={householdStyleSet ? activeHouseholdStyle.scheduleLabel : "Set up schedules"}
            icon="clock"
            position={{ left: "84%", top: "16.5%" }}
            onClick={() => setScheduleOpen(true)}
            labelSide="left"
          />

          <RoomHotspot
            label={familyInboxItems.length ? `Family inbox · ${familyInboxItems.length}` : "Family inbox"}
            icon="mail"
            position={{ left: "65%", top: "36.8%" }}
            onClick={() => setInboxOpen(true)}
            badge={familyInboxItems.length || undefined}
            labelSide="right"
          />

          <div className="absolute bottom-[5.8rem] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/55 bg-[#27271f]/45 px-3 py-1.5 text-[10px] font-medium text-white/90 shadow-lg backdrop-blur-lg">
            Tap an object to open it
          </div>
        </section>
      </main>

      <ModalShell
        open={Boolean(selectedMember)}
        title="Our family"
        subtitle={`${members.length} household member${members.length === 1 ? "" : "s"}`}
        onClose={() => setSelectedMember(null)}
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/family/household"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              <UiIcon name="users" className="h-4 w-4" />
              Manage profiles
            </Link>
            <button
              type="button"
              onClick={() => {
                setSelectedMember(null);
                setInviteOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#718068]/20 bg-[#e7ede1] px-4 py-3 text-sm font-semibold text-[#4e6048]"
            >
              <UiIcon name="mail" className="h-4 w-4" />
              {canManageHousehold ? "Invite someone" : "View invitations"}
              {invites.length ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#aa5548] px-1.5 text-[10px] font-bold text-white">
                  {invites.length}
                </span>
              ) : null}
            </button>
          </div>
        }
      >
        {selectedMember ? (
          <div className="space-y-4">
            {members.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      member.id === selectedMember.id
                        ? "border-[#76886a] bg-[#dfe8d6] text-[#43533d]"
                        : "border-black/10 bg-white/70 text-ink/55"
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-4 rounded-3xl border border-white/80 bg-white/70 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#dfe8d6] text-lg font-semibold text-[#52664a]">
                {selectedMember.initials}
              </span>
              <div>
                <p className="font-semibold text-ink">{selectedMember.name}</p>
                <p className="mt-0.5 text-sm text-ink/55">
                  {selectedMember.role} · {selectedMember.access}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/65 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                  Relationship
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {selectedMember.role || "Family member"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/65 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                  Last active
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedMember.lastActive}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink/60">{selectedMember.note}</p>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={inboxOpen}
        title="Family inbox"
        subtitle={
          familyInboxItems.length
            ? `${familyInboxItems.length} shared item${familyInboxItems.length === 1 ? "" : "s"} to keep the household moving.`
            : "Shared forms, letters and important shortcuts will appear here."
        }
        onClose={() => setInboxOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/intake"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-3 py-3 text-center text-xs font-semibold text-white shadow-sm sm:text-sm"
            >
              <UiIcon name="mail" className="h-4 w-4" />
              Intake queue
            </Link>
            <Link
              href="/capture"
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#718068]/20 bg-[#e7ede1] px-3 py-3 text-center text-xs font-semibold text-[#4e6048] sm:text-sm"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Scan family item
            </Link>
          </div>
        }
      >
        {familyInboxItems.length ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/75 px-4 py-3 text-xs leading-5 text-ink/60">
              These are shared action cards and secure shortcuts. Original documents stay in their proper DiaryDock room.
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5">
              {familyInboxItems.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm"
                >
                  <Link href={item.href} className="flex min-w-0 items-center gap-3 transition hover:opacity-80">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2eadc] text-[#5d7353]">
                      <UiIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink/48">{item.detail}</span>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${item.statusTone}`}>
                        {item.status}
                      </span>
                    </span>
                    <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
                  </Link>

                  {item.actionable ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3">
                      <label className="min-w-0 space-y-1">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-ink/38">
                          Assigned to
                        </span>
                        <select
                          value={item.assignedTo ?? ""}
                          onChange={(event) => updateInboxItem(item, "assignedTo", event.target.value)}
                          className="w-full min-w-0 rounded-xl border border-black/8 bg-white/80 px-2.5 py-2 text-[11px] font-semibold text-ink outline-none focus:border-[#738767]"
                        >
                          <option value="">Unassigned</option>
                          {item.assignedTo && !familyAssignees.includes(item.assignedTo) ? (
                            <option value={item.assignedTo}>{item.assignedTo}</option>
                          ) : null}
                          {familyAssignees.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="min-w-0 space-y-1">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-ink/38">
                          Due date
                        </span>
                        <input
                          type="date"
                          value={item.dueDate ?? ""}
                          onChange={(event) => updateInboxItem(item, "dueDate", event.target.value)}
                          className="w-full min-w-0 rounded-xl border border-black/8 bg-white/80 px-2.5 py-2 text-[11px] font-semibold text-ink outline-none focus:border-[#738767]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateInboxItem(item, "complete")}
                        className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#e4ecde] px-3 py-2 text-xs font-semibold text-[#52664a] transition hover:bg-[#dae5d3]"
                      >
                        <UiIcon name="check" className="h-3.5 w-3.5" />
                        Mark complete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/75 text-[#607455]">
              <UiIcon name="check" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">Nothing needs attention</p>
            <p className="mt-1 text-xs leading-5 text-ink/50">
              New family forms, shared reminders and secure shortcuts will collect here automatically.
            </p>
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={scheduleOpen}
        title={householdStyleSet ? activeHouseholdStyle.scheduleLabel : "Set up schedules"}
        subtitle="Repeating weekly routines live here. Dated events stay on the Kitchen wall calendar."
        onClose={() => setScheduleOpen(false)}
        footer={
          householdStyleSet ? (
            <Link
              href="/family/schedules"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              <UiIcon name="calendar" className="h-4 w-4" />
              Open {activeHouseholdStyle.scheduleLabel.toLowerCase()}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f]/45 px-4 py-3 text-sm font-semibold text-white"
            >
              Choose your household above
            </button>
          )
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {householdStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => selectHouseholdStyle(style.id)}
                className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                  style.id === householdStyle
                    ? "border-[#788c6c] bg-[#e3eadc] text-[#41533b]"
                    : "border-black/8 bg-white/70 text-ink/55"
                }`}
              >
                {style.shortLabel}
              </button>
            ))}
          </div>

          <p className="rounded-2xl bg-white/60 px-4 py-3 text-xs leading-5 text-ink/60">
            {activeHouseholdStyle.description}
          </p>

          <div className="grid gap-2">
            {activeHouseholdStyle.features.map((feature) => (
              <Link
                key={feature.label}
                href={feature.href}
                className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 px-3 py-2.5 shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e2eadc] text-[#5d7353]">
                  <UiIcon name={feature.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{feature.label}</span>
                  <span className="block truncate text-[11px] text-ink/45">{feature.detail}</span>
                </span>
                <UiIcon name="chevron-right" className="h-4 w-4 text-ink/30" />
              </Link>
            ))}
          </div>

          {activeKidRoutines.length ? (
            <div className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/75 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                Weekly routines
              </p>
              <div className="mt-2 space-y-1.5">
                {activeKidRoutines.map((routine) => (
                  <div key={routine.id} className="flex items-center gap-2 text-xs text-ink/65">
                    <span className="min-w-0 flex-1 truncate font-semibold">{routine.title}</span>
                    <span className="text-[#607455]">{weekDayNames[routine.day]}</span>
                    <span className="text-ink/40">{routine.startTime}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 px-4 py-3 text-center text-xs text-ink/50">
              {householdStyle === "children"
                ? "No weekly routines yet. Add the first family schedule."
                : "No weekly routines yet. Add the first household schedule."}
            </p>
          )}
        </div>
      </ModalShell>

      <ModalShell
        open={inviteOpen}
        title={canManageHousehold ? "Invite someone" : "Household invitations"}
        subtitle={
          canManageHousehold
            ? "Welcome someone into your DiaryDock household."
            : "Only the household owner can create invitations."
        }
        onClose={closeInvite}
        footer={
          canManageHousehold ? (
            <button
              type="button"
              onClick={() => void sendInvite()}
              disabled={inviteBusy}
              className="w-full rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-55"
            >
              {inviteBusy ? "Creating secure invitation..." : "Create invitation"}
            </button>
          ) : undefined
        }
      >
        {canManageHousehold ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-ink/60">Name</span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Their name"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-3 text-sm text-ink outline-none focus:border-[#738767]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-ink/60">Relationship</span>
                <input
                  value={draft.relation}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, relation: event.target.value }))
                  }
                  placeholder="Partner, parent..."
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-3 text-sm text-ink outline-none focus:border-[#738767]"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-ink/60">Email address</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="family@example.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-3 text-sm text-ink outline-none focus:border-[#738767]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-ink/60">Starting access</span>
              <select
                value={draft.access}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, access: event.target.value }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-3 text-sm text-ink outline-none focus:border-[#738767]"
              >
                {inviteAccessOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            {invites.length ? (
              <div className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/80 px-4 py-3 text-xs font-medium text-ink/60">
                {invites.length} invitation{invites.length === 1 ? "" : "s"} currently waiting.
              </div>
            ) : null}
            {message ? (
              <p className="rounded-2xl bg-[#fff3d8] px-4 py-3 text-xs font-semibold text-ink/65">
                {message}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/75 bg-white/65 p-5 text-sm leading-6 text-ink/60">
            You can view the people in this household. The owner manages invitations and access
            from the Front Gate.
          </div>
        )}
      </ModalShell>
    </>
  );
}
