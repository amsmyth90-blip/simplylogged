"use client";

import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { RemindersBoard } from "@/components/RemindersBoard";
import { UiIcon } from "@/components/UiIcon";
import { ReminderEditorModal } from "@/components/reminders/ReminderEditorModal";
import { RemindersOverview } from "@/components/reminders/RemindersOverview";
import {
  buildReminderDraft,
  defaultReminderDraft,
  reminderRoomOptions,
  snoozeReminder,
  type ReminderDraft,
} from "@/components/reminders/reminder-workspace-model";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

type RemindersWorkspaceProps = { initialReminders: Reminder[] };

function RemindersWorkspaceInner() {
  const { canEditShared, state, repositoryMode, updateState } = useDiaryDockData();
  const reminders = state.reminders;
  const [draft, setDraft] = useState<ReminderDraft>(defaultReminderDraft);
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
            ...state.kidSchedules.map((routine) => routine.childName.trim()),
          ].filter(Boolean),
        ),
      ),
    [state.householdMembers, state.householdProfiles, state.kidSchedules],
  );

  useEffect(() => {
    const person =
      new URLSearchParams(window.location.search).get("person")?.trim() ?? "";
    if (person) setSelectedAssignee(person);
  }, []);

  const visibleReminders = selectedAssignee
    ? reminders.filter(
        (item) =>
          item.assignedTo?.toLowerCase() === selectedAssignee.toLowerCase(),
      )
    : reminders;
  const focusItems = visibleReminders
    .filter((item) => item.priority === "high" && item.group !== "done")
    .slice(0, 3);
  const repeatingItems = visibleReminders
    .filter((item) => item.repeat)
    .slice(0, 3);
  const documentFollowUps = visibleReminders
    .filter((item) => item.documentId)
    .slice(0, 4);
  const groupedCounts = {
    today: visibleReminders.filter((item) => item.group === "today").length,
    week: visibleReminders.filter((item) => item.group === "week").length,
    later: visibleReminders.filter((item) => item.group === "later").length,
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setDraft(defaultReminderDraft);
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...defaultReminderDraft, assignedTo: selectedAssignee });
    setOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setDraft(buildReminderDraft(reminder));
    setOpen(true);
  };

  const persistReminder = async (nextReminder: Reminder) => {
    updateState((current) => ({
      ...current,
      reminders: current.reminders.map((item) =>
        item.id === nextReminder.id ? nextReminder : item,
      ),
    }));
    if (repositoryMode === "supabase")
      await upsertStructuredReminder(nextReminder);
  };

  const saveReminder = async () => {
    const title = draft.title.trim();
    const timeLabel = draft.timeLabel.trim();
    if (!title || !timeLabel) return;
    const room = reminderRoomOptions.find((item) => item.id === draft.roomId);
    const existing = editingId
      ? reminders.find((item) => item.id === editingId)
      : null;
    const nextReminder: Reminder = {
      ...existing,
      id: editingId ?? crypto.randomUUID(),
      title,
      note: draft.note.trim() || undefined,
      roomId: draft.roomId || undefined,
      roomName: room?.name,
      group: draft.group,
      timeLabel,
      priority: draft.priority,
      repeat: draft.repeat.trim() || undefined,
      assignedTo: draft.assignedTo.trim() || undefined,
    };
    updateState((current) => ({
      ...current,
      reminders: editingId
        ? current.reminders.map((item) =>
            item.id === editingId ? nextReminder : item,
          )
        : [nextReminder, ...current.reminders],
    }));
    if (repositoryMode === "supabase")
      await upsertStructuredReminder(nextReminder);
    closeModal();
  };

  const toggleDone = (reminder: Reminder) => {
    const nextReminder: Reminder =
      reminder.group === "done"
        ? {
            ...reminder,
            group: "today",
            timeLabel:
              reminder.timeLabel === "Completed" ? "Today" : reminder.timeLabel,
          }
        : { ...reminder, group: "done", timeLabel: "Completed" };
    void persistReminder(nextReminder);
  };

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="Reminders"
          title="What Matters, When It Matters"
          subtitle="Gentle reminders to keep your life in order."
          heroImage="/images/pages/reminders-hero.webp"
          heroPosition="center 36%"
          badge={
            selectedAssignee
              ? `${selectedAssignee}'s reminders`
              : "Household rhythm"
          }
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
                {repositoryMode === "supabase"
                  ? "Secure sync"
                  : "Local session"}
              </span>
              {canEditShared ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/22"
                >
                  <UiIcon name="plus" className="h-4 w-4" />
                  New
                </button>
              ) : (
                <span className="rounded-full border border-white/30 bg-white/14 px-3 py-2 text-[11px] font-semibold text-white/90">
                  View only
                </span>
              )}
            </div>
          }
        />
        <RemindersOverview
          documentFollowUps={documentFollowUps}
          focusItems={focusItems}
          groupedCounts={groupedCounts}
          onOpen={canEditShared ? openEdit : undefined}
          repeatingItems={repeatingItems}
        />
        <RemindersBoard
          reminders={visibleReminders}
          onOpenReminder={canEditShared ? openEdit : undefined}
          onToggleDone={canEditShared ? toggleDone : undefined}
          onSnooze={canEditShared ? (reminder) =>
            void persistReminder(snoozeReminder(reminder))
          : undefined}
        />
      </div>
      <ReminderEditorModal
        assignees={assigneeOptions}
        draft={draft}
        editing={Boolean(editingId)}
        onClose={closeModal}
        onSave={() => void saveReminder()}
        open={open}
        setDraft={setDraft}
      />
    </>
  );
}

export function RemindersWorkspace(props: RemindersWorkspaceProps) {
  void props;
  return <RemindersWorkspaceInner />;
}
