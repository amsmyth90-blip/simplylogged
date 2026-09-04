"use client";

import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { CorrespondenceRecord } from "@/lib/correspondence-records";
import { openPrivateDocument } from "@/lib/document-storage";
import type { Reminder } from "@/lib/mock-data";
import { formatDate } from "@/lib/presentation";
import { upsertStructuredReminder } from "@/lib/structured-data";

export function useCorrespondenceDetail(correspondenceId: string) {
  const { state, updateState } = useDiaryDockData();
  const original = state.correspondence.correspondence.find(
    (item) => item.id === correspondenceId,
  );
  const [draft, setDraft] = useState(original);
  const [responseNote, setResponseNote] = useState("");
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState(false);

  const update = <K extends keyof CorrespondenceRecord>(
    key: K,
    value: CorrespondenceRecord[K],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };
  const persist = (next: CorrespondenceRecord, success: string) => {
    setDraft(next);
    updateState((current) => ({
      ...current,
      correspondence: {
        correspondence: current.correspondence.correspondence.map((item) =>
          item.id === next.id ? next : item,
        ),
      },
    }));
    setMessage(success);
  };
  const save = () => {
    if (!draft) return;
    persist(
      {
        ...draft,
        reviewStatus: "reviewed",
        updatedAt: new Date().toISOString(),
      },
      "Letter details saved.",
    );
  };
  const markComplete = () => {
    if (!draft) return;
    persist(
      {
        ...draft,
        status: "completed",
        actions: draft.actions.map((action) => ({
          ...action,
          completed: true,
        })),
        reviewStatus: "reviewed",
        updatedAt: new Date().toISOString(),
      },
      "Correspondence marked complete.",
    );
  };
  const addResponse = () => {
    if (!draft || !responseNote.trim()) return;
    const now = new Date().toISOString();
    persist(
      {
        ...draft,
        responses: [
          {
            id: crypto.randomUUID(),
            note: responseNote.trim(),
            createdAt: now,
          },
          ...draft.responses,
        ],
        updatedAt: now,
      },
      "Follow-up note saved.",
    );
    setResponseNote("");
  };
  const addAction = (label: string) => {
    if (!draft || !label.trim()) return;
    update("actions", [
      ...draft.actions,
      { id: crypto.randomUUID(), label: label.trim(), completed: false },
    ]);
  };
  const createReminder = async () => {
    if (!draft) return;
    if (!draft.deadline) {
      setMessage("Add a deadline before creating a reminder.");
      return;
    }
    const id = `correspondence-${draft.id}-${draft.deadline}`;
    const reminder: Reminder = {
      id,
      title:
        draft.actions.find((action) => !action.completed)?.label ||
        `Respond to ${draft.sender || draft.title}`,
      note: `Linked to ${draft.title || "important correspondence"}. Check the original letter before acting.`,
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatDate(draft.deadline),
      priority: "high",
      documentId: draft.documentId,
      documentTitle: draft.title,
      dueDate: draft.deadline,
    };
    updateState((current) => ({
      ...current,
      reminders: [
        reminder,
        ...current.reminders.filter((item) => item.id !== id),
      ],
      correspondence: {
        correspondence: current.correspondence.correspondence.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                linkedReminderIds: Array.from(
                  new Set([...item.linkedReminderIds, id]),
                ),
              }
            : item,
        ),
      },
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Deadline reminder added.");
  };
  const openDocument = async () => {
    if (!draft) return;
    setOpening(true);
    setMessage("");
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to open the original letter.",
      );
    } finally {
      setOpening(false);
    }
  };

  return {
    state,
    draft,
    responseNote,
    message,
    opening,
    setResponseNote,
    update,
    save,
    markComplete,
    addResponse,
    addAction,
    createReminder,
    openDocument,
  };
}

export type CorrespondenceDetailController = ReturnType<
  typeof useCorrespondenceDetail
>;
