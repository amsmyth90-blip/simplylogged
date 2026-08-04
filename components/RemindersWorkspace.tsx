"use client";

import { useEffect, useMemo, useState } from "react";

import { LifeDockDataProvider, useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { RemindersBoard } from "@/components/RemindersBoard";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import { roomDetails, type Reminder, type ReminderGroup } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

type ReminderDraft = {
  title: string;
  note: string;
  roomId: string;
  group: ReminderGroup;
  timeLabel: string;
  priority: Reminder["priority"];
  repeat: string;
  assignedTo: string;
};

type RemindersWorkspaceProps = {
  initialReminders: Reminder[];
};

const defaultDraft: ReminderDraft = {
  title: "",
  note: "",
  roomId: "",
  group: "today",
  timeLabel: "",
  priority: "normal",
  repeat: "",
  assignedTo: ""
};

function buildDraft(reminder?: Reminder): ReminderDraft {
  if (!reminder) {
    return defaultDraft;
  }

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

function snoozeReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    group: "week",
    timeLabel: "In 7 days",
    priority: reminder.priority === "high" ? "normal" : reminder.priority
  };
}

function RemindersWorkspaceInner() {
  const { state, repositoryMode, updateState } = useLifeDockData();
  const reminders = state.reminders;
  const [draft, setDraft] = useState<ReminderDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...state.householdProfiles
              .filter((profile) => profile.showInReminders)
              .map((profile) => profile.name.trim()),
            ...state.householdMembers.map((member) => member.name.trim()),
            ...state.kidSchedules.map((routine) => routine.childName.trim())
          ].filter(Boolean)
        )
      ),
    [state.householdMembers, state.householdProfiles, state.kidSchedules]
  );

  useEffect(() => {
    const person = new URLSearchParams(window.location.search).get("person")?.trim() ?? "";
    if (person) {
      setSelectedAssignee(person);
    }
  }, []);

  const roomOptions = useMemo(
    () =>
      Object.values(roomDetails)
        .map((room) => ({ id: room.id, name: room.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const visibleReminders = selectedAssignee
    ? reminders.filter(
        (item) => item.assignedTo?.toLowerCase() === selectedAssignee.toLowerCase()
      )
    : reminders;
  const focusItems = visibleReminders.filter((item) => item.priority === "high" && item.group !== "done").slice(0, 3);
  const repeatingItems = visibleReminders.filter((item) => item.repeat).slice(0, 3);
  const documentFollowUps = visibleReminders.filter((item) => item.documentId).slice(0, 4);
  const groupedCounts = {
    today: visibleReminders.filter((item) => item.group === "today").length,
    week: visibleReminders.filter((item) => item.group === "week").length,
    later: visibleReminders.filter((item) => item.group === "later").length
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setDraft(defaultDraft);
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...defaultDraft, assignedTo: selectedAssignee });
    setOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setDraft(buildDraft(reminder));
    setOpen(true);
  };

  const saveReminder = async () => {
    const title = draft.title.trim();
    const timeLabel = draft.timeLabel.trim();

    if (!title || !timeLabel) {
      return;
    }

    const room = roomOptions.find((item) => item.id === draft.roomId);
    const existingReminder = editingId ? reminders.find((item) => item.id === editingId) : null;
    const nextReminder: Reminder = {
      ...existingReminder,
      id: editingId ?? `r${Date.now()}`,
      title,
      note: draft.note.trim() || undefined,
      roomId: draft.roomId || undefined,
      roomName: room?.name,
      group: draft.group,
      timeLabel,
      priority: draft.priority,
      repeat: draft.repeat.trim() || undefined,
      assignedTo: draft.assignedTo.trim() || undefined
    };

    updateState((current) => ({
      ...current,
      reminders: editingId
        ? current.reminders.map((item) => (item.id === editingId ? nextReminder : item))
        : [nextReminder, ...current.reminders]
    }));

    if (repositoryMode === "supabase") {
      await upsertStructuredReminder(nextReminder);
    }

    closeModal();
  };

  const updateReminder = async (nextReminder: Reminder) => {
    updateState((current) => ({
      ...current,
      reminders: current.reminders.map((item) => (item.id === nextReminder.id ? nextReminder : item))
    }));

    if (repositoryMode === "supabase") {
      await upsertStructuredReminder(nextReminder);
    }
  };

  const toggleDone = (reminder: Reminder) => {
    const nextReminder: Reminder =
      reminder.group === "done"
        ? { ...reminder, group: "today", timeLabel: reminder.timeLabel === "Completed" ? "Today" : reminder.timeLabel }
        : { ...reminder, group: "done", timeLabel: "Completed" };

    void updateReminder(nextReminder);
  };

  const snooze = (reminder: Reminder) => {
    void updateReminder(snoozeReminder(reminder));
  };

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="Reminders"
          title="What Matters, When It Matters"
          subtitle="Gentle reminders to keep your life in order."
          heroImage="/images/pages/reminders-hero.png"
          heroPosition="center 36%"
          badge={selectedAssignee ? `${selectedAssignee}'s reminders` : "Household rhythm"}
          action={
            <div className="flex items-center gap-2">
              {selectedAssignee ? (
                <button
                  type="button"
                  onClick={() => setSelectedAssignee("")}
                  className="rounded-full border border-white/30 bg-white/14 px-3 py-2 text-[11px] font-semibold text-white/90 backdrop-blur-md"
                >
                  Show everyone
                </button>
              ) : null}
              <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
                {repositoryMode === "supabase" ? "Supabase live" : "Session demo"}
              </span>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/22"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                New
              </button>
            </div>
          }
        />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="estate-sheet p-5">
            <SectionHeader title="Today's focus" hint="The next things to move forward" />
            <div className="mt-4 space-y-3">
              {focusItems.map((reminder) => (
                <button
                  key={reminder.id}
                  type="button"
                  onClick={() => openEdit(reminder)}
                  className="estate-sheet flex w-full items-start gap-3.5 p-4 text-left transition hover:-translate-y-0.5"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{reminder.title}</span>
                    {reminder.note ? (
                      <span className="mt-1 block text-[13px] leading-5 text-ink/55">{reminder.note}</span>
                    ) : null}
                    <span className="mt-2 block text-xs font-medium text-ink/50">{reminder.timeLabel}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="estate-sheet p-5">
            <SectionHeader title="Steady rhythms" hint="Repeating jobs that keep DiaryDock current" />
            <div className="mt-4 space-y-3">
              {repeatingItems.map((reminder) => (
                <button
                  key={reminder.id}
                  type="button"
                  onClick={() => openEdit(reminder)}
                  className="estate-sheet flex w-full items-start gap-3 p-3.5 text-left transition hover:-translate-y-0.5"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{reminder.title}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-ink/50">{reminder.timeLabel}</span>
                      {reminder.repeat ? (
                        <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          {reminder.repeat}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="estate-sheet p-5">
            <SectionHeader title="Document follow-ups" hint="Renewals and dates linked to saved files" />
            <div className="mt-4 space-y-3">
              {documentFollowUps.length ? (
                documentFollowUps.map((reminder) => (
                  <button
                    key={reminder.id}
                    type="button"
                    onClick={() => openEdit(reminder)}
                    className="flex w-full items-center gap-3.5 rounded-[24px] border border-white/70 bg-white/62 p-3.5 text-left transition hover:bg-white"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage/60 text-moss">
                      <UiIcon name="file" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{reminder.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink/50">
                        {reminder.documentTitle ?? "Linked document"} - {reminder.timeLabel}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-[24px] border border-dashed border-white/80 bg-white/45 px-4 py-5 text-sm leading-6 text-ink/55">
                  Scan a document with a renewal or appointment date and DiaryDock will suggest a linked reminder here.
                </p>
              )}
            </div>
          </div>

          <div className="estate-sheet p-5">
            <SectionHeader title="Email into DiaryDock" hint="Planned intake path for bills and appointments" />
            <div className="mt-4 rounded-[26px] bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(237,244,239,0.76))] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mist text-sky-700">
                  <UiIcon name="mail" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Yes, email sharing is possible.</p>
                  <p className="mt-1 text-xs leading-5 text-ink/55">
                    The production version can support forwarding bills or appointments to a private DiaryDock email address,
                    then using the same AI confirm-and-file flow as scanning.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {["Forward email", "AI reads attachment", "Confirm room + reminder"].map((step, index) => (
                  <div key={step} className="rounded-2xl bg-white/70 px-3 py-3">
                    <p className="text-[11px] font-semibold text-ink/40">Step {index + 1}</p>
                    <p className="mt-1 text-xs font-semibold text-ink/68">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: groupedCounts.today, tone: "text-orange-600" },
            { label: "This week", value: groupedCounts.week, tone: "text-sky-700" },
            { label: "Later", value: groupedCounts.later, tone: "text-moss" }
          ].map((stat) => (
            <article key={stat.label} className="estate-sheet px-4 py-3.5 text-center">
              <p className={`text-2xl font-semibold tracking-tight ${stat.tone}`}>{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">{stat.label}</p>
            </article>
          ))}
        </section>

        <RemindersBoard reminders={visibleReminders} onOpenReminder={openEdit} onToggleDone={toggleDone} onSnooze={snooze} />
      </div>

      <ModalShell
        open={open}
        title={editingId ? "Edit reminder" : "New reminder"}
        subtitle="Shared across the app through the DiaryDock data layer."
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveReminder()}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              Save reminder
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Home insurance renewal"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Note</span>
            <textarea
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              placeholder="Add any context for the household."
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Room</span>
              <select
                value={draft.roomId}
                onChange={(event) => setDraft((current) => ({ ...current, roomId: event.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="">No room yet</option>
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Due</span>
              <input
                type="text"
                value={draft.timeLabel}
                onChange={(event) => setDraft((current) => ({ ...current, timeLabel: event.target.value }))}
                placeholder="This Friday"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">For</span>
              <select
                value={draft.assignedTo}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, assignedTo: event.target.value }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="">Everyone</option>
                {draft.assignedTo && !assigneeOptions.includes(draft.assignedTo) ? (
                  <option value={draft.assignedTo}>{draft.assignedTo}</option>
                ) : null}
                {assigneeOptions.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Stage</span>
              <select
                value={draft.group}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, group: event.target.value as ReminderGroup }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="later">Later</option>
                <option value="done">Done</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target.value as Reminder["priority"]
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Repeat</span>
              <input
                type="text"
                value={draft.repeat}
                onChange={(event) => setDraft((current) => ({ ...current, repeat: event.target.value }))}
                placeholder="Weekly"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        </div>
      </ModalShell>
    </>
  );
}

export function RemindersWorkspace(_: RemindersWorkspaceProps) {
  return <RemindersWorkspaceInner />;
}
